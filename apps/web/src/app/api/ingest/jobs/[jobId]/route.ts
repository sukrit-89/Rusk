import { NextRequest } from "next/server";

import { apiHeaders, apiUrl, forwardJson } from "@/lib/server-api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return forwardJson(
    fetch(apiUrl(`/ingest/jobs/${jobId}`), {
      method: "GET",
      headers: apiHeaders({}, request)
    })
  );
}
