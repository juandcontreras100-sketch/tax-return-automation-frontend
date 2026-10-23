import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { backendFetch, jsonError, proxyBackendResponse } from "@/lib/server/backend";
import {
  assertSameOrigin,
  createSession,
  deleteSession,
  getSessionFromRequest,
  isSecureRequest,
  setSessionCookies,
} from "@/lib/server/session";
import type { TokenResponse, User } from "@/lib/types";

export async function POST(request: NextRequest): Promise<Response> {
  if (!assertSameOrigin(request)) {
    return jsonError(403, "Origen no permitido.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "La solicitud de inicio de sesión no es válida.");
  }

  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const email = typeof record.email === "string" ? record.email : "";
  const password = typeof record.password === "string" ? record.password : "";
  if (!email || !password) {
    return jsonError(400, "Ingresa tu correo y contraseña.");
  }

  try {
    const loginResponse = await backendFetch("/v1/auth/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    if (!loginResponse.ok) {
      return proxyBackendResponse(loginResponse);
    }

    const tokens = (await loginResponse.json()) as TokenResponse;
    if (!tokens.access_token || !tokens.refresh_token) {
      return jsonError(502, "El servidor devolvió una sesión incompleta.");
    }

    const meResponse = await backendFetch("/v1/auth/me", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    if (!meResponse.ok) {
      return proxyBackendResponse(meResponse);
    }
    const user = (await meResponse.json()) as User;

    const previous = getSessionFromRequest(request);
    deleteSession(previous?.id);

    const session = createSession(tokens);
    const response = NextResponse.json(user, {
      headers: { "Cache-Control": "no-store" },
    });
    setSessionCookies(response, session, isSecureRequest(request));
    return response;
  } catch {
    return jsonError(
      503,
      "No pudimos conectar con el servidor de autenticación. Inténtalo de nuevo.",
    );
  }
}
