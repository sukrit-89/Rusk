from datetime import datetime

from pydantic import BaseModel, Field


class Citation(BaseModel):
    document_id: str
    document_name: str
    page: int | None = None
    section: str | None = None
    chunk_index: int
    relevance_score: float


class AttestationReceipt(BaseModel):
    id: str | None = None
    tee_mode: str
    provider: str
    model_name: str
    model_hash: str
    response_hash: str
    citations_hash: str
    signature: str
    certificate: dict = Field(default_factory=dict)


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)
    mode: str = "enterprise"
    session_id: str | None = None


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    attestation: AttestationReceipt
    latency_ms: int


class IngestResponse(BaseModel):
    mode: str
    document_count: int
    chunk_count: int
    warnings: list[str] = Field(default_factory=list)


class IngestJobResponse(BaseModel):
    job_id: str
    status: str
    mode: str


class IngestJobStatus(IngestJobResponse):
    document_count: int = 0
    chunk_count: int = 0
    warnings: list[str] = Field(default_factory=list)
    error: str | None = None
    created_at: datetime
    updated_at: datetime


class VerifyRequest(BaseModel):
    receipt: AttestationReceipt


class VerifyResponse(BaseModel):
    valid: bool
    reason: str


class HealthResponse(BaseModel):
    status: str
    tee_mode: str
    vector_store: str
    llm: str
    model: str
    embedding_provider: str
    database: str


class StatusResponse(BaseModel):
    health: HealthResponse
    documents: int
    chunks: int
    receipts: int
