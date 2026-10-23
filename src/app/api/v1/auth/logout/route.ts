import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { backendFetch, jsonError } from "@/lib/server/backend";
import {
  assertSameOrigin,
  clearSessionCookies,
  deleteSession,
  getSessionFromRequest,
  isSecureRequest,
} from "@/lib/server/session";

export async function POST(request: NextRequest): Promise<Response> {
  if (!assertSameOrigin(request)) {
    return jsonError(403, "Origen no permitido.");
  }

  const session = getSessionFromRequest(request);
  if (session) {
    deleteSession(session.id);
    try {
      await backendFetch("/v1/auth/logout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
    } catch {
      // La cookie y la sesión local ya se eliminaron; la revocación es best-effort.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response, isSecureRequest(request));
  return response;
}
