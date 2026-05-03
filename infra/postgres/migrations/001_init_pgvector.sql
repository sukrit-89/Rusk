CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL CHECK (mode IN ('medical', 'legal', 'enterprise')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  page_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('medical', 'legal', 'enterprise')),
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  section TEXT,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  embedding vector(384),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS chunks_mode_idx ON chunks(mode);
CREATE INDEX IF NOT EXISTS documents_collection_idx ON documents(collection_id);

CREATE TABLE IF NOT EXISTS attestation_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_hash TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_hash TEXT NOT NULL,
  tee_mode TEXT NOT NULL,
  provider TEXT NOT NULL,
  receipt JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
