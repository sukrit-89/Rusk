# Technical Requirements Document
# Offline Multimodal RAG + TEE Assistant

**Status:** Reset baseline  
**Updated:** May 2, 2026

## 1. Architecture Decision

| Layer | Decision |
|---|---|
| Frontend | Next.js App Router in `apps/web` |
| Backend/API | FastAPI in `services/api` |
| Retrieval V1 | Vector retrieval with a later GraphRAG/Neo4j extension point |
| Vector DB | Postgres with pgvector |
| Graph DB | None in V1; Neo4j-compatible boundary for V2 |
| LLM Runtime | Ollama-first local inference with hosted fallback boundary |
| TEE Target | NearAI TEE path through deployment YAML and adapter layer |
| Modalities | Text, PDFs, images in V1; audio deferred until the core pipeline is stable |

## 2. Runtime Topology

```text
Browser
  -> Next.js App Router chatbot
  -> FastAPI RAG service
  -> Postgres/pgvector
  -> Ollama local model runtime
  -> NearAI TEE adapter when deployed confidentially
```

## 3. Service Boundaries

The Next.js app owns the chatbot UX, mode switching, file upload, citations, and attestation display. It must not own retrieval logic, model secrets, or database credentials.

The FastAPI service owns ingestion, chunking, embeddings, retrieval, generation, and receipt creation. It exposes `/health`, `/ingest`, `/query`, and `/verify`.

Postgres stores collections, documents, chunks, vector embeddings, and attestation receipts. The initial embedding dimension is 384 for `sentence-transformers/all-MiniLM-L6-v2`.

The TEE adapter starts in explicit development mode. `TEE_MODE=none` must never be represented as production confidentiality. NearAI mode must replace placeholder receipts with real attestation certificates and sealed storage.

## 4. V1 Requirements

- Text and PDF ingestion must work end-to-end.
- Image files must enter the corpus through a caption/OCR adapter; metadata-only handling is acceptable during the reset baseline.
- Retrieval must return top-k chunks with document and page/section citations.
- The UI must show citations and a verifier action for every assistant response.
- The database schema must be migration-controlled.
- The deployment file must expose web port `3000` and API port `8000`.

## 5. V2 GraphRAG Path

GraphRAG is intentionally not part of V1 implementation. Add Neo4j only after evaluation proves that relationship-heavy questions fail with pgvector retrieval. The future graph layer should derive entities and relationships during ingestion without replacing the chunk/citation store.

## 6. Known Gaps

- NearAI attestation API integration is pending.
- Sealed storage is pending.
- Hosted fallback provider contract is only a boundary.
- Background ingestion jobs and progress events are pending.
- Browser and API verification require local dependency installation.

