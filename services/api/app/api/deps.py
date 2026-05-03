from fastapi import Header, HTTPException, status
import httpx

from app.core.config import get_settings


async def require_request_auth(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> None:
    settings = get_settings()
    if not settings.require_supabase_jwt and x_api_key == settings.local_api_key:
        return

    token = _bearer_token(authorization)
    if token:
        await _verify_supabase_token(token)
        return

    detail = "Missing Supabase bearer token" if settings.require_supabase_jwt else "Invalid or missing local API key"
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


async def _verify_supabase_token(token: str) -> None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase verification is not configured on the API.",
        )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": settings.supabase_anon_key},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Supabase verification unavailable: {exc}",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase session")
