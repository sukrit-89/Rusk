export function apiUrl(path: string) {
  const baseUrl = process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function apiHeaders(extra: HeadersInit = {}, request?: Request) {
  const authorization = request?.headers.get("authorization");
  return {
    ...extra,
    "X-API-Key": process.env.LOCAL_API_KEY ?? "local-dev-key",
    ...(authorization ? { Authorization: authorization } : {})
  };
}

export async function forwardJson(upstream: Promise<Response>) {
  try {
    const response = await upstream;
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend request failed";
    return Response.json(
      {
        detail: `Rusk API unavailable at ${apiUrl("")}: ${message}`,
        hint: "Start the FastAPI backend on port 8000, or set INTERNAL_API_BASE_URL/NEXT_PUBLIC_API_BASE_URL to the running API."
      },
      { status: 503 }
    );
  }
}
