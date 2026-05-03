from app.api.schemas import Citation
from app.security.attestation import create_receipt, verify_receipt


def test_local_sealed_receipt_verifies() -> None:
    receipt = create_receipt(
        "answer",
        [
            Citation(
                document_id="doc-1",
                document_name="notes.txt",
                chunk_index=0,
                relevance_score=0.99,
            )
        ],
    )

    valid, reason = verify_receipt(receipt)

    assert valid is True
    assert "sealed local" in reason
    assert receipt.certificate["type"] == "local-sealed-hmac"
