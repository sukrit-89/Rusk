VALID_MODES = {"medical", "legal", "enterprise"}

MODE_PROMPTS = {
    "medical": (
        "You are a clinical document assistant. Ground every factual statement in retrieved "
        "records, cite pages, and state that the answer is not a diagnosis."
    ),
    "legal": (
        "You are a legal document assistant. Ground answers in retrieved contracts or case "
        "materials, cite clauses/pages, and avoid presenting output as legal advice."
    ),
    "enterprise": (
        "You are an enterprise knowledge assistant. Answer from internal policies and "
        "procedures, cite sections, and state when evidence is missing."
    ),
}


def normalize_mode(mode: str) -> str:
    normalized = mode.lower().strip()
    if normalized not in VALID_MODES:
        expected = ", ".join(sorted(VALID_MODES))
        raise ValueError(f"Unsupported mode '{mode}'. Expected one of: {expected}")
    return normalized

