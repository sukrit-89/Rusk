from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, status as http_status
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import require_request_auth
from app.api.schemas import (
    HealthResponse,
    IngestJobResponse,
    IngestJobStatus,
    QueryRequest,
    StatusResponse,
    VerifyRequest,
    VerifyResponse,
)
from app.core.config import get_settings
from app.db.postgres import get_connection
from app.ingestion.jobs import create_ingest_job, get_ingest_job, run_ingest_job
from app.rag.embeddings import embedding_provider
from app.rag.service import query, verify

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    database_status = "ok"
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1").fetchone()
    except Exception:
        database_status = "unavailable"
    return HealthResponse(
        status="ok" if database_status == "ok" else "degraded",
        tee_mode=settings.tee_mode,
        vector_store="postgres-pgvector",
        llm="ollama-first",
        model=settings.ollama_model,
        embedding_provider=embedding_provider(),
        database=database_status,
    )


@app.get("/status", response_model=StatusResponse, dependencies=[Depends(require_request_auth)])
def status() -> StatusResponse:
    counts = {"documents": 0, "chunks": 0, "receipts": 0}
    try:
        with get_connection() as conn:
            counts["documents"] = conn.execute("SELECT count(*) AS count FROM documents").fetchone()["count"]
            counts["chunks"] = conn.execute("SELECT count(*) AS count FROM chunks").fetchone()["count"]
            counts["receipts"] = conn.execute("SELECT count(*) AS count FROM attestation_receipts").fetchone()["count"]
    except Exception:
        pass
    return StatusResponse(health=health(), **counts)


@app.post(
    "/ingest",
    response_model=IngestJobResponse,
    status_code=http_status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_request_auth)],
)
async def ingest(background_tasks: BackgroundTasks, mode: str = Form(default="enterprise"), files: list[UploadFile] = File(...)):
    job = create_ingest_job(mode)
    job_dir = get_settings().upload_dir / "jobs" / job.job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    paths: list[Path] = []
    for upload in files:
        filename = Path(upload.filename or "upload.bin").name
        path = job_dir / filename
        path.write_bytes(await upload.read())
        paths.append(path)

    background_tasks.add_task(run_ingest_job, job.job_id, paths, mode)
    return IngestJobResponse(job_id=job.job_id, status=job.status, mode=job.mode)


@app.get("/ingest/jobs/{job_id}", response_model=IngestJobStatus, dependencies=[Depends(require_request_auth)])
def ingest_job(job_id: str):
    job = get_ingest_job(job_id)
    if not job:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Ingestion job not found")
    return job


@app.post("/query", dependencies=[Depends(require_request_auth)])
async def ask(request: QueryRequest):
    return await query(request.question, request.mode)


@app.post("/verify", response_model=VerifyResponse, dependencies=[Depends(require_request_auth)])
def verify_attestation(request: VerifyRequest):
    valid, reason = verify(request.receipt)
    return VerifyResponse(valid=valid, reason=reason)
