import type { NextRequest } from "next/server";

import { backendFetch, jsonError, proxyBackendResponse } from "@/lib/server/backend";
import { assertSameOrigin } from "@/lib/server/session";

export async function POST(request: NextRequest): Promise<Response> {
  if (!assertSameOrigin(request)) {
    return jsonError(403, "Origen no permitido.");
  }

  try {
    const contentType =
      request.headers.get("content-type") ?? "application/json";
    const upstream = await backendFetch("/v1/auth/register", {
      method: "POST",
      headers: {
        Accept: request.headers.get("accept") ?? "application/json",
        "Content-Type": contentType,
      },
      body: await request.arrayBuffer(),
    });
    return proxyBackendResponse(upstream);
  } catch {
    return jsonError(
      503,
      "No pudimos conectar con el servidor de registro. Inténtalo de nuevo.",
    );
  }
}
