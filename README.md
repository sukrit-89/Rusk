# Rusk AI

<p align="center">
  <img src="docs/assets/RuskAI.png" alt="Rusk AI trusted document intelligence logo" width="520" />
</p>

Rusk AI is a private, multimodal RAG assistant designed around one core promise: answers should be useful, cited, and verifiable. It combines a production web workspace with a Python RAG backend, pgvector retrieval, Supabase authentication, and a trusted execution layer that can attach attestable receipts to generated answers.

The project is intentionally built as a real application rather than a prototype panel: Next.js for the product UI, FastAPI for retrieval and model orchestration, Postgres/pgvector for evidence storage, and a NearAI/Phala-style TEE deployment path for verifiable execution.

## Trusted Execution Layer

The trusted execution layer is the center of Rusk AI. Every answer can carry an attestation receipt that binds together:

- the generated response hash
- the citation set hash
- the selected model name and model hash
- the active TEE mode
- the attestation provider
- a signature and certificate payload

In local development, Rusk AI uses a sealed HMAC key stored outside source control so the receipt flow can be tested end to end. In production, `TEE_MODE=nearai` is designed to fail closed unless real attestation and verification endpoints are configured.

Required production-facing variables:

```env
TEE_MODE=nearai
NEARAI_ATTESTATION_URL=https://your-attestation-service/attest
NEARAI_VERIFY_URL=https://your-attestation-service/verify
SEALED_STORAGE_DIR=/secure/sealed
```

This keeps development honest: local receipts are useful for workflow testing, but Rusk AI should only claim hardware-backed trusted execution once the deployed attestation service is connected.

## Product Capabilities

- Authenticated web workspace with Supabase sign-in/sign-up
- Landing, auth, and workspace routes built with Next.js App Router
- Text, PDF, and image ingestion
- OCR and LLaVA-ready image captioning path
- Async ingestion jobs with status polling
- pgvector-backed retrieval with citation metadata
- Ollama-first local generation with hosted LLM fallback support
- Answer receipts and `/verify` endpoint for attestation validation
- Medical, legal, and enterprise retrieval modes
- GraphRAG-ready architecture without forcing graph complexity into V1

## Architecture

```text
apps/web
  Next.js App Router UI, auth pages, workspace, API proxy routes

services/api
  FastAPI backend for ingestion, retrieval, generation, receipts, and verification

infra/postgres
  pgvector schema for collections, documents, chunks, and attestation receipts

nearai.deployment.yaml
  NearAI deployment shape for web/API services
```

Request flow:

```text
Browser -> Next.js route handler -> FastAPI -> pgvector retrieval -> LLM -> attestation receipt -> UI
```

## Local Development

Copy the example environment and fill in secrets:

```powershell
Copy-Item .env.example .env
```

Start the stack:

```powershell
docker compose -f docker-compose.dev.yml up --build
```

Default local services:

```text
Web: http://localhost:3000
API: http://localhost:8000
Postgres: localhost:5432
Ollama: http://localhost:11434
```

If port `3000` is busy:

```powershell
$env:WEB_PORT=3001
docker compose -f docker-compose.dev.yml up --build
```

Pull a local model:

```powershell
docker compose -f docker-compose.dev.yml exec ollama ollama pull mistral
```

## Environment

Minimum useful environment:

```env
LOCAL_API_KEY=local-dev-key
DATABASE_URL=postgresql://rag:rag@localhost:5432/rag
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
LLAVA_MODEL=llava
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
TEE_MODE=none
SEALED_STORAGE_DIR=sealed
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
REQUIRE_SUPABASE_JWT=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For hosted LLM fallback, use an OpenAI-compatible provider:

```env
HOSTED_LLM_BASE_URL=https://api.groq.com/openai/v1
HOSTED_LLM_API_KEY=your-provider-key
OLLAMA_MODEL=llama-3.1-8b-instant
```

## API Surface

```text
GET  /health
GET  /status
POST /ingest
GET  /ingest/jobs/{job_id}
POST /query
POST /verify
```

Frontend proxy routes:

```text
/api/status
/api/ingest
/api/ingest/jobs/[jobId]
/api/query
/api/verify
```

## Deployment Notes

Recommended free/manual split:

- Frontend: Vercel, root directory `apps/web`
- Backend: Render Python service, root directory `services/api`
- Database/auth: Supabase with pgvector enabled
- Hosted LLM: Groq or another OpenAI-compatible endpoint

Render backend commands:

```text
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set Vercel API variables to the deployed backend URL:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api.onrender.com
INTERNAL_API_BASE_URL=https://your-api.onrender.com
LOCAL_API_KEY=local-dev-key
```


