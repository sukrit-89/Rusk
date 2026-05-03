import shutil
import time
from pathlib import Path
from uuid import uuid4

from psycopg.types.json import Jsonb

from app.api.schemas import Citation, IngestResponse, QueryResponse
from app.core.config import get_settings
from app.core.modes import MODE_PROMPTS, normalize_mode
from app.db.postgres import get_connection
from app.ingestion.loaders import detect_mime, load_path, sha256_file
from app.rag.chunking import chunk_text, token_count
from app.rag.embeddings import embed_texts
from app.rag.llm import generate_answer
from app.security.attestation import create_receipt, verify_receipt


def ingest_files(paths: list[Path], mode: str) -> IngestResponse:
    settings = get_settings()
    mode = normalize_mode(mode)
    collection_name = f"{mode}-{uuid4()}"
    warnings: list[str] = []
    document_count = 0
    chunk_count = 0

    with get_connection() as conn:
        collection_id = conn.execute(
            "INSERT INTO collections (mode, name) VALUES (%s, %s) RETURNING id",
            (mode, collection_name),
        ).fetchone()["id"]

        for path in paths:
            stored_path = _archive_upload(path)
            pages, page_warnings = load_path(stored_path)
            warnings.extend(page_warnings)
            if not pages:
                continue

            document = conn.execute(
                """
                INSERT INTO documents (collection_id, filename, mime_type, sha256, page_count, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    collection_id,
                    stored_path.name,
                    detect_mime(stored_path),
                    sha256_file(stored_path),
                    max((page.page_number or 0 for page in pages), default=0) or None,
                    Jsonb({"path": str(stored_path)}),
                ),
            ).fetchone()
            document_count += 1

            chunk_rows = []
            for page in pages:
                for content, index in chunk_text(page.text, settings.chunk_size, settings.chunk_overlap):
                    chunk_rows.append((content, index, page.page_number, page.section, token_count(content)))
            embeddings = embed_texts([row[0] for row in chunk_rows])
            for row, embedding in zip(chunk_rows, embeddings):
                conn.execute(
                    """
                    INSERT INTO chunks
                      (document_id, mode, content, chunk_index, page_number, section, token_count, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (document["id"], mode, row[0], row[1], row[2], row[3], row[4], embedding),
                )
            chunk_count += len(chunk_rows)

        conn.commit()

    return IngestResponse(mode=mode, document_count=document_count, chunk_count=chunk_count, warnings=warnings)


async def query(question: str, mode: str) -> QueryResponse:
    started = time.perf_counter()
    settings = get_settings()
    mode = normalize_mode(mode)
    query_embedding = embed_texts([question])[0]

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
              chunks.content,
              chunks.chunk_index,
              chunks.page_number,
              chunks.section,
              documents.id AS document_id,
              documents.filename AS document_name,
              1 - (chunks.embedding <=> %s::vector) AS relevance_score
            FROM chunks
            JOIN documents ON documents.id = chunks.document_id
            WHERE chunks.mode = %s AND chunks.embedding IS NOT NULL
            ORDER BY chunks.embedding <=> %s::vector
            LIMIT %s
            """,
            (query_embedding, mode, query_embedding, settings.top_k),
        ).fetchall()

    citations = [
        Citation(
            document_id=str(row["document_id"]),
            document_name=row["document_name"],
            page=row["page_number"],
            section=row["section"],
            chunk_index=row["chunk_index"],
            relevance_score=round(float(row["relevance_score"]), 6),
        )
        for row in rows
    ]
    contexts = [(row["content"], citation) for row, citation in zip(rows, citations)]
    answer = await generate_answer(MODE_PROMPTS[mode], question, contexts)
    receipt = create_receipt(answer, citations)
    with get_connection() as conn:
        receipt_row = conn.execute(
            """
            INSERT INTO attestation_receipts
              (response_hash, model_name, model_hash, tee_mode, provider, receipt)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                receipt.response_hash,
                receipt.model_name,
                receipt.model_hash,
                receipt.tee_mode,
                receipt.provider,
                Jsonb(receipt.model_dump(mode="json")),
            ),
        ).fetchone()
        conn.commit()
    receipt.id = str(receipt_row["id"])
    latency_ms = int((time.perf_counter() - started) * 1000)
    return QueryResponse(answer=answer, citations=citations, attestation=receipt, latency_ms=latency_ms)


def verify(receipt) -> tuple[bool, str]:
    return verify_receipt(receipt)


def _archive_upload(path: Path) -> Path:
    settings = get_settings()
    target = settings.upload_dir / f"{uuid4()}-{path.name}"
    if path.resolve() != target.resolve():
        shutil.copy2(path, target)
    return target
