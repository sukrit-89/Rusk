import { apiHeaders, apiUrl, forwardJson } from "@/lib/server-api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return forwardJson(
    fetch(apiUrl("/status"), {
      method: "GET",
      headers: apiHeaders({}, request)
    })
  );
}
