from app.rag.chunking import chunk_text


def test_chunk_text_overlaps() -> None:
    chunks = chunk_text("one two three four five six", chunk_size=4, overlap=2)

    assert chunks == [("one two three four", 0), ("three four five six", 1)]

