import { getSupabaseBrowserClient } from "@/lib/supabase";

export type Mode = "medical" | "legal" | "enterprise";

export type Citation = {
  document_id: string;
  document_name: string;
  page: number | null;
  section: string | null;
  chunk_index: number;
  relevance_score: number;
};

export type AttestationReceipt = {
  id: string | null;
  tee_mode: string;
  provider: string;
  model_name: string;
  model_hash: string;
  response_hash: string;
  citations_hash: string;
  signature: string;
  certificate: Record<string, unknown>;
};

export type QueryResponse = {
  answer: string;
  citations: Citation[];
  attestation: AttestationReceipt;
  latency_ms: number;
};

export type ApiStatus = {
  health: {
    status: string;
    tee_mode: string;
    vector_store: string;
    llm: string;
    model: string;
    embedding_provider: string;
    database: string;
  };
  documents: number;
  chunks: number;
  receipts: number;
};

export type IngestJobStatus = {
  job_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  mode: Mode;
  document_count: number;
  chunk_count: number;
  warnings: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
};

export async function queryRag(question: string, mode: Mode): Promise<QueryResponse> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ question, mode })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function ingestFiles(files: File[], mode: Mode, onProgress?: (job: IngestJobStatus) => void) {
  const body = new FormData();
  body.set("mode", mode);
  files.forEach((file) => body.append("files", file));

  const response = await fetch("/api/ingest", {
    method: "POST",
    headers: await authHeaders(),
    body
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const job = (await response.json()) as { job_id: string };
  return pollIngestJob(job.job_id, onProgress);
}

export async function verifyReceipt(receipt: AttestationReceipt): Promise<{ valid: boolean; reason: string }> {
  const response = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ receipt })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  const response = await fetch("/api/status", {
    method: "GET",
    headers: await authHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function pollIngestJob(jobId: string, onProgress?: (job: IngestJobStatus) => void) {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const response = await fetch(`/api/ingest/jobs/${jobId}`, {
      method: "GET",
      headers: await authHeaders(),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const job = (await response.json()) as IngestJobStatus;
    onProgress?.(job);
    if (job.status === "succeeded") {
      return {
        mode: job.mode,
        document_count: job.document_count,
        chunk_count: job.chunk_count,
        warnings: job.warnings
      };
    }
    if (job.status === "failed") {
      throw new Error(job.error ?? "Ingestion job failed");
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error("Ingestion job timed out.");
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return {};
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
