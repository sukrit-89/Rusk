import { NextRequest } from "next/server";

import { apiHeaders, apiUrl, forwardJson } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return forwardJson(
    fetch(apiUrl("/verify"), {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }, request),
      body
    })
  );
}
