from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from uuid import uuid4

from app.api.schemas import IngestJobStatus
from app.rag.service import ingest_files

_jobs: dict[str, IngestJobStatus] = {}
_lock = Lock()


def create_ingest_job(mode: str) -> IngestJobStatus:
    now = _now()
    job = IngestJobStatus(
        job_id=str(uuid4()),
        mode=mode,
        status="queued",
        created_at=now,
        updated_at=now,
    )
    with _lock:
        _jobs[job.job_id] = job
    return job


def get_ingest_job(job_id: str) -> IngestJobStatus | None:
    with _lock:
        return _jobs.get(job_id)


def run_ingest_job(job_id: str, paths: list[Path], mode: str) -> None:
    _update_job(job_id, status="running")
    try:
        result = ingest_files(paths, mode)
        _update_job(
            job_id,
            status="succeeded",
            mode=result.mode,
            document_count=result.document_count,
            chunk_count=result.chunk_count,
            warnings=result.warnings,
        )
    except Exception as exc:
        _update_job(job_id, status="failed", error=str(exc))


def _update_job(job_id: str, **changes) -> None:
    with _lock:
        job = _jobs[job_id]
        data = job.model_dump()
        data.update(changes)
        data["updated_at"] = _now()
        _jobs[job_id] = IngestJobStatus(**data)


def _now() -> datetime:
    return datetime.now(UTC)
