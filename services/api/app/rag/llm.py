import httpx

from app.api.schemas import Citation
from app.core.config import get_settings

GREETING_RESPONSES = {"hi", "hello", "hey", "hii", "yo", "good morning", "good afternoon", "good evening"}


async def generate_answer(system_prompt: str, question: str, contexts: list[tuple[str, Citation]]) -> str:
    greeting = _friendly_greeting(question)
    if greeting:
        return greeting

    settings = get_settings()
    prompt = _build_prompt(system_prompt, question, contexts)

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                f"{settings.ollama_host.rstrip('/')}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            response.raise_for_status()
            answer = response.json().get("response", "").strip()
            if answer:
                return answer
        except httpx.HTTPError:
            if settings.hosted_llm_base_url and settings.hosted_llm_api_key:
                return await _hosted_fallback(prompt)

    return _extractive_answer(contexts)


def _friendly_greeting(question: str) -> str | None:
    normalized = " ".join(question.lower().strip(" \t\r\n.!?,").split())
    if normalized not in GREETING_RESPONSES:
        return None
    return (
        "Summary:\n"
        "- Hi, welcome to Rusk AI. I am ready to help you explore your private documents with cited, verifiable answers.\n\n"
        "Key Evidence:\n"
        "- Upload PDFs, text files, or images in the Corpus tab, then ask a question about them.\n"
        "- I will show source citations and an attestation receipt whenever I answer from indexed material.\n\n"
        "Limitations:\n"
        "- I can answer best after you ingest documents for the selected mode."
    )


def _build_prompt(system_prompt: str, question: str, contexts: list[tuple[str, Citation]]) -> str:
    context_text = "\n\n".join(
        f"[{index}] {citation.document_name}"
        f"{' page ' + str(citation.page) if citation.page else ''}: {text}"
        for index, (text, citation) in enumerate(contexts, start=1)
    )
    return (
        f"{system_prompt}\n\n"
        "Use only the retrieved context. Cite document names and page or section. "
        "Say when the evidence is insufficient.\n\n"
        "Format the answer exactly like this:\n"
        "Summary:\n"
        "- One direct answer in plain language.\n\n"
        "Key Evidence:\n"
        "- Evidence point with source in parentheses.\n"
        "- Evidence point with source in parentheses.\n\n"
        "Limitations:\n"
        "- State missing evidence, uncertainty, or the relevant safety/legal/medical caveat.\n\n"
        "Rules:\n"
        "- Use short bullets, not long paragraphs.\n"
        "- Do not use markdown tables.\n"
        "- Keep the answer under 220 words unless the user asks for more detail.\n"
        "- Every factual bullet must be grounded in the provided context.\n\n"
        f"Context:\n{context_text}\n\nQuestion: {question}\nAnswer:"
    )


async def _hosted_fallback(prompt: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.hosted_llm_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.hosted_llm_api_key}"},
            json={
                "model": settings.ollama_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()


def _extractive_answer(contexts: list[tuple[str, Citation]]) -> str:
    if not contexts:
        return "No indexed evidence was found for this mode yet."
    lines = ["Local fallback answer from the most relevant indexed passages:"]
    for text, citation in contexts[:3]:
        snippet = " ".join(text.split()[:90])
        location = f"page {citation.page}" if citation.page else citation.section or f"chunk {citation.chunk_index}"
        lines.append(f"- {snippet} [{citation.document_name}, {location}]")
    return "\n".join(lines)
