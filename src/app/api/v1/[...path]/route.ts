import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { backendFetch, jsonError, proxyBackendResponse } from "@/lib/server/backend";
import {
  CSRF_COOKIE,
  assertCsrf,
  assertSameOrigin,
  clearSessionCookies,
  deleteSession,
  getSessionFromRequest,
  isSecureRequest,
  refreshSession,
  setCsrfCookie,
} from "@/lib/server/session";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function backendPath(path: string[], request: NextRequest): string {
  const encoded = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `/v1/${encoded}${request.nextUrl.search}`;
}

function sessionExpiredResponse(
  request: NextRequest,
  detail = "La sesión expiró. Inicia sesión de nuevo.",
): NextResponse {
  const response = NextResponse.json(
    { detail },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
  clearSessionCookies(response, isSecureRequest(request));
  return response;
}

async function handle(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const method = request.method.toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";

  if (mutating && !assertSameOrigin(request)) {
    return jsonError(403, "Origen no permitido.");
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return sessionExpiredResponse(request);
  }
  if (mutating && !assertCsrf(request, session)) {
    return jsonError(403, "Token CSRF inválido. Recarga la página e inténtalo de nuevo.");
  }

  const { path } = await context.params;
  const target = backendPath(path, request);
  const headers = new Headers();
  headers.set("Accept", request.headers.get("accept") ?? "application/json");
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  let body: ArrayBuffer | undefined;
  if (mutating) {
    try {
      body = await request.arrayBuffer();
    } catch {
      return jsonError(400, "No pudimos leer la solicitud.");
    }
  }

  try {
    let upstream = await backendFetch(target, {
      method,
      headers,
      body,
    });

    if (upstream.status === 401) {
      const refreshed = await refreshSession(session.id);
      if (refreshed.status === "expired") {
        return sessionExpiredResponse(request);
      }
      if (refreshed.status === "unavailable") {
        return jsonError(
          503,
          "No pudimos renovar la sesión. Inténtalo de nuevo en unos segundos.",
        );
      }

      headers.set(
        "Authorization",
        `Bearer ${refreshed.tokens.access_token}`,
      );
      upstream = await backendFetch(target, { method, headers, body });
    }

    if (upstream.status === 401) {
      deleteSession(session.id);
      return sessionExpiredResponse(request);
    }

    const response = proxyBackendResponse(upstream);
    if (request.cookies.get(CSRF_COOKIE)?.value !== session.csrfToken) {
      setCsrfCookie(response, session, isSecureRequest(request));
    }
    return response;
  } catch {
    return jsonError(
      503,
      "No pudimos conectar con el servidor. Verifica que el backend esté disponible.",
    );
  }
}

export function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handle(request, context);
}

export function HEAD(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handle(request, context);
}

export function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handle(request, context);
}

export function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handle(request, context);
}

export function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handle(request, context);
}

export function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handle(request, context);
}
