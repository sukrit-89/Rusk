import { NextRequest } from "next/server";

import { apiHeaders, apiUrl, forwardJson } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return forwardJson(
    fetch(apiUrl("/ingest"), {
      method: "POST",
      headers: apiHeaders({}, request),
      body: formData
    })
  );
}
