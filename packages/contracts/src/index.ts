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

