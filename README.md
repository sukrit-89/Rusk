# Rusk AI

Production-oriented rebuild for the PRD in this repository. The old prototype was removed; the project is now shaped around:

- Next.js App Router chatbot UI in `apps/web`
- FastAPI RAG service in `services/api`
- Supabase authentication in the web app
- Postgres + pgvector storage in `infra/postgres`
- Ollama-first local inference with a hosted fallback boundary
- NearAI TEE deployment path kept explicit instead of simulated as production security

## Local Development

1. Copy `.env.example` to `.env` and adjust secrets.
2. Start Postgres, Ollama, API, and web:

```powershell
docker compose -f docker-compose.dev.yml up --build
```

3. Add Supabase public auth env values:

```powershell
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Pull a local model once:

```powershell
docker compose -f docker-compose.dev.yml exec ollama ollama pull mistral
```

The web app runs on `http://localhost:3000`; the API runs on `http://localhost:8000`.

Routes:

- `/` landing page
- `/auth` Supabase sign-in/sign-up
- `/workspace` authenticated RAG workspace
- `/api/status` frontend proxy for API health and corpus counts

Auth notes:

- Password sign-in/sign-up uses the Supabase browser client.
- If Supabase email confirmation is enabled, sign-up will ask the user to confirm email before workspace access.
- `/workspace` checks the browser session and redirects back to `/auth` when unauthenticated.

Backend API:

- `GET /health`
- `GET /status`
- `POST /ingest`
- `POST /query`
- `POST /verify`

## Important Security Note

`TEE_MODE=none` is development mode. Current attestation receipts are placeholders so product work can proceed. Do not claim hardware-backed privacy until the NearAI attestation and sealed-storage adapter replaces `services/api/app/security/attestation.py`.

## Next Milestones

- Replace local placeholder attestation with NearAI TEE certificate verification.
- Add background ingestion jobs and progress events.
- Add LLaVA image captioning and OCR pipeline.
- Add authentication beyond the local API key before multi-user deployment.
- Add evaluation benchmarks for retrieval precision@5 and latency.
