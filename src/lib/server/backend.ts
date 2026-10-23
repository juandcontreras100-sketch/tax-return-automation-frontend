import { NextResponse } from "next/server";

const DEFAULT_BACKEND_API_URL = "http://127.0.0.1:8080/api";

/**
 * URL interna del backend. No debe llevar el prefijo NEXT_PUBLIC porque solo la
 * usa el servidor de Next.js; el navegador habla exclusivamente con /api.
 */
export const BACKEND_API_URL = (
  process.env.API_INTERNAL_URL ?? DEFAULT_BACKEND_API_URL
).replace(/\/+$/, "");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function backendFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${BACKEND_API_URL}${normalized}`, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(60_000),
  });
}

export function proxyBackendResponse(upstream: Response): NextResponse {
  const headers = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  });
  if (!headers.has("cache-control")) {
    headers.set("Cache-Control", "no-store");
  }

  const hasBody = upstream.status !== 204 && upstream.status !== 304;
  return new NextResponse(hasBody ? upstream.body : null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export function jsonError(status: number, detail: string): Response {
  return Response.json({ detail }, { status });
}
