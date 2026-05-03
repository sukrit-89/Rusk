import hashlib
import base64
import mimetypes
from dataclasses import dataclass
from pathlib import Path

import httpx

from app.core.config import get_settings


@dataclass(frozen=True)
class LoadedPage:
    text: str
    page_number: int | None = None
    section: str | None = None
    metadata: dict | None = None


TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".log"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"}


def detect_mime(path: Path) -> str:
    return mimetypes.guess_type(str(path))[0] or "application/octet-stream"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_path(path: Path) -> tuple[list[LoadedPage], list[str]]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _load_pdf(path)
    if suffix in TEXT_EXTENSIONS:
        return _load_text(path), []
    if suffix in IMAGE_EXTENSIONS:
        return _load_image(path)
    return [], [f"Unsupported file type skipped: {path.name}"]


def _load_text(path: Path) -> list[LoadedPage]:
    raw = path.read_bytes()
    for encoding in ("utf-8", "utf-16", "cp1252", "latin-1"):
        try:
            return [LoadedPage(text=raw.decode(encoding), section=path.stem, metadata={"encoding": encoding})]
        except UnicodeDecodeError:
            continue
    return [LoadedPage(text=raw.decode("utf-8", errors="replace"), section=path.stem, metadata={"encoding": "replace"})]


def _load_pdf(path: Path) -> tuple[list[LoadedPage], list[str]]:
    try:
        import fitz
    except Exception:
        return [], ["PyMuPDF is unavailable; PDF ingestion cannot run."]

    pages: list[LoadedPage] = []
    warnings: list[str] = []
    try:
        with fitz.open(path) as document:
            for page_index, page in enumerate(document, start=1):
                text = page.get_text("text").strip()
                if text:
                    pages.append(LoadedPage(text=text, page_number=page_index, metadata={"pdf_page": page_index}))
    except Exception as exc:
        warnings.append(f"Failed to read PDF {path.name}: {exc}")
    return pages, warnings


def _load_image(path: Path) -> tuple[list[LoadedPage], list[str]]:
    warnings: list[str] = []
    parts: list[str] = []
    metadata = {"modality": "image"}

    try:
        from PIL import Image

        with Image.open(path) as image:
            width, height = image.size
            mode = image.mode
            metadata.update({"width": width, "height": height, "mode": mode})
            parts.append(f"Image file {path.name}: {width}x{height} {mode}.")
            ocr_text = _ocr_image(image)
            if ocr_text:
                parts.append(f"OCR text:\n{ocr_text}")
            else:
                warnings.append(f"No OCR text detected in image: {path.name}")
    except Exception as exc:
        parts.append(f"Image file {path.name}.")
        warnings.append(f"Failed to inspect image {path.name}: {exc}")

    caption, caption_warning = _caption_image(path)
    if caption:
        parts.append(f"Visual caption:\n{caption}")
    elif caption_warning:
        warnings.append(caption_warning)

    if len(parts) == 1:
        warnings.append(f"Image {path.name} had no extracted OCR text or LLaVA caption.")

    return [LoadedPage(text="\n\n".join(parts), section="image", metadata=metadata)], warnings


def _ocr_image(image) -> str:
    try:
        import pytesseract
    except Exception:
        return ""
    try:
        return pytesseract.image_to_string(image).strip()
    except Exception:
        return ""


def _caption_image(path: Path) -> tuple[str, str | None]:
    settings = get_settings()
    if not settings.ollama_host or not settings.llava_model:
        return "", "Ollama LLaVA captioning is not configured."

    try:
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        response = httpx.post(
            f"{settings.ollama_host.rstrip('/')}/api/generate",
            json={
                "model": settings.llava_model,
                "prompt": "Caption this image for retrieval. Include visible text, objects, entities, layout, and any document-like details.",
                "images": [encoded],
                "stream": False,
            },
            timeout=60,
        )
        response.raise_for_status()
        caption = str(response.json().get("response", "")).strip()
        return caption, None if caption else f"LLaVA returned an empty caption for image: {path.name}"
    except Exception as exc:
        return "", f"LLaVA captioning failed for {path.name}: {exc}"
