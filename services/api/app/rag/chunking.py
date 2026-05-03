import re


def token_count(text: str) -> int:
    return len(re.findall(r"\S+", text))


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[tuple[str, int]]:
    tokens = re.findall(r"\S+", text)
    if not tokens:
        return []
    if overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    chunks: list[tuple[str, int]] = []
    start = 0
    index = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunks.append((" ".join(tokens[start:end]), index))
        if end == len(tokens):
            break
        start = end - overlap
        index += 1
    return chunks

