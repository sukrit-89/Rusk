import hashlib
import math
import re
from functools import lru_cache

from app.core.config import get_settings

DIMENSIONS = 384


@lru_cache(maxsize=1)
def get_embedding_model():
    from sentence_transformers import SentenceTransformer

    settings = get_settings()
    return SentenceTransformer(settings.embedding_model, local_files_only=True)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    try:
        model = get_embedding_model()
        vectors = model.encode(texts, normalize_embeddings=True)
        return [list(map(float, vector)) for vector in vectors]
    except Exception:
        return [_hash_embed(text) for text in texts]


def embedding_provider() -> str:
    try:
        get_embedding_model()
        return "sentence-transformers"
    except Exception:
        return "hash-fallback"


def _hash_embed(text: str) -> list[float]:
    vector = [0.0] * DIMENSIONS
    tokens = re.findall(r"[a-zA-Z0-9_]+", text.lower())
    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "big") % DIMENSIONS
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[bucket] += sign
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]
