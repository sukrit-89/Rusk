import hashlib
import hmac
import json
import os
from typing import Any

import httpx

from app.api.schemas import AttestationReceipt, Citation
from app.core.config import get_settings

_KEY_FILE = "attestation_hmac_key.bin"


def create_receipt(answer: str, citations: list[Citation]) -> AttestationReceipt:
    settings = get_settings()
    response_hash = _sha256_text(answer)
    citations_hash = _sha256_json([citation.model_dump(mode="json") for citation in citations])
    model_hash = _sha256_text(f"{settings.ollama_model}:{settings.embedding_model}")
    payload = {
        "tee_mode": settings.tee_mode,
        "provider": _provider(),
        "model_name": settings.ollama_model,
        "model_hash": model_hash,
        "response_hash": response_hash,
        "citations_hash": citations_hash,
    }
    signature = _sign(payload)
    certificate = _local_certificate()
    if settings.tee_mode.lower() == "nearai":
        signature, certificate = _nearai_attestation(payload, signature)

    return AttestationReceipt(
        tee_mode=settings.tee_mode,
        provider=_provider(),
        model_name=settings.ollama_model,
        model_hash=model_hash,
        response_hash=response_hash,
        citations_hash=citations_hash,
        signature=signature,
        certificate=certificate,
    )


def verify_receipt(receipt: AttestationReceipt) -> tuple[bool, str]:
    payload = {
        "tee_mode": receipt.tee_mode,
        "provider": receipt.provider,
        "model_name": receipt.model_name,
        "model_hash": receipt.model_hash,
        "response_hash": receipt.response_hash,
        "citations_hash": receipt.citations_hash,
    }
    if receipt.provider == "nearai":
        return _verify_nearai_receipt(receipt, payload)
    if hmac.compare_digest(_sign(payload), receipt.signature):
        return True, "Receipt signature is valid for the sealed local development key."
    return False, "Receipt signature mismatch."


def _provider() -> str:
    settings = get_settings()
    return "nearai" if settings.tee_mode.lower() == "nearai" else "local-sealed"


def _sign(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hmac.new(_sealed_key(), canonical, hashlib.sha256).hexdigest()


def _sealed_key() -> bytes:
    settings = get_settings()
    key_path = settings.sealed_storage_dir / _KEY_FILE
    if key_path.exists():
        return key_path.read_bytes()
    key = os.urandom(32)
    key_path.write_bytes(key)
    return key


def _local_certificate() -> dict[str, Any]:
    settings = get_settings()
    return {
        "type": "local-sealed-hmac",
        "sealed_storage": str(settings.sealed_storage_dir),
        "tee_mode": settings.tee_mode,
    }


def _nearai_attestation(payload: dict[str, Any], fallback_signature: str) -> tuple[str, dict[str, Any]]:
    settings = get_settings()
    if not settings.nearai_attestation_url:
        raise RuntimeError("TEE_MODE=nearai requires NEARAI_ATTESTATION_URL to generate an attested receipt.")

    response = httpx.post(
        settings.nearai_attestation_url,
        json={"payload": payload, "payload_hash": _sha256_json(payload), "signature": fallback_signature},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    certificate = data.get("certificate") or data.get("attestation") or data
    if not isinstance(certificate, dict):
        certificate = {"attestation": certificate}
    certificate.setdefault("type", "nearai-tee-attestation")
    return str(data.get("signature") or fallback_signature), certificate


def _verify_nearai_receipt(receipt: AttestationReceipt, payload: dict[str, Any]) -> tuple[bool, str]:
    settings = get_settings()
    if settings.nearai_verify_url:
        try:
            response = httpx.post(
                settings.nearai_verify_url,
                json={
                    "payload": payload,
                    "payload_hash": _sha256_json(payload),
                    "signature": receipt.signature,
                    "certificate": receipt.certificate,
                },
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            valid = bool(data.get("valid", False))
            return valid, str(data.get("reason") or ("NearAI attestation verifier accepted receipt." if valid else "NearAI attestation verifier rejected receipt."))
        except Exception as exc:
            return False, f"NearAI attestation verifier unavailable: {exc}"
    return False, "NearAI receipt requires NEARAI_VERIFY_URL for server-side verification."


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _sha256_json(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
