import { randomBytes, timingSafeEqual } from "node:crypto";

import type { NextRequest, NextResponse } from "next/server";

import type { TokenResponse } from "@/lib/types";
import { backendFetch } from "./backend";

export const SESSION_COOKIE = "taxfrom_session";
export const CSRF_COOKIE = "taxfrom_csrf";

const DEFAULT_REFRESH_SECONDS = 30 * 24 * 60 * 60;
const SESSION_PRUNE_INTERVAL_MS = 60_000;

export type ServerSession = {
  id: string;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  refreshExpiresAt: number;
};

export type RefreshResult =
  | { status: "ok"; tokens: TokenResponse; session: ServerSession }
  | { status: "expired" }
  | { status: "unavailable" };

type SessionStore = {
  sessions: Map<string, ServerSession>;
  refreshes: Map<string, Promise<RefreshResult>>;
  lastPruneAt: number;
};

// En Next.js cada route handler puede recibir un contexto de módulo distinto.
// `process` sí es único por instancia del servidor, así que el store sobrevive
// al hot reload y es visible desde login y desde el proxy.
const processStore = process as unknown as {
  __taxfromBffStore?: SessionStore;
};

const store: SessionStore = (processStore.__taxfromBffStore ??= {
  sessions: new Map(),
  refreshes: new Map(),
  lastPruneAt: 0,
});

function refreshLifetimeSeconds(tokens: TokenResponse): number {
  const value = Number(tokens.refresh_expires_in);
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_REFRESH_SECONDS;
}

function pruneExpiredSessions(): void {
  const now = Date.now();
  if (now - store.lastPruneAt < SESSION_PRUNE_INTERVAL_MS) {
    return;
  }
  store.lastPruneAt = now;
  for (const [id, session] of store.sessions) {
    if (session.refreshExpiresAt <= now) {
      store.sessions.delete(id);
    }
  }
}

export function createSession(tokens: TokenResponse): ServerSession {
  pruneExpiredSessions();
  const session: ServerSession = {
    id: randomBytes(32).toString("base64url"),
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    csrfToken: randomBytes(32).toString("base64url"),
    refreshExpiresAt:
      Date.now() + refreshLifetimeSeconds(tokens) * 1000,
  };
  store.sessions.set(session.id, session);
  return session;
}

export function getSessionById(id: string | undefined): ServerSession | null {
  if (!id) {
    return null;
  }
  pruneExpiredSessions();
  const session = store.sessions.get(id);
  if (!session) {
    return null;
  }
  if (session.refreshExpiresAt <= Date.now()) {
    store.sessions.delete(id);
    return null;
  }
  return session;
}

export function getSessionFromRequest(
  request: NextRequest,
): ServerSession | null {
  return getSessionById(request.cookies.get(SESSION_COOKIE)?.value);
}

export function deleteSession(id: string | undefined): void {
  if (id) {
    store.sessions.delete(id);
  }
}

export function sessionCookieMaxAge(session: ServerSession): number {
  return Math.max(
    60,
    Math.floor((session.refreshExpiresAt - Date.now()) / 1000),
  );
}

export function isSecureRequest(request: NextRequest): boolean {
  const forwarded = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwarded) {
    return forwarded === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export function setSessionCookies(
  response: NextResponse,
  session: ServerSession,
  secure: boolean,
): void {
  const maxAge = sessionCookieMaxAge(session);
  response.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  setCsrfCookie(response, session, secure);
}

export function setCsrfCookie(
  response: NextResponse,
  session: ServerSession,
  secure: boolean,
): void {
  response.cookies.set(CSRF_COOKIE, session.csrfToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge(session),
  });
}

export function clearSessionCookies(
  response: NextResponse,
  secure: boolean,
): void {
  for (const name of [SESSION_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: name === SESSION_COOKIE,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin) {
    try {
      return Boolean(host) && new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

export function assertCsrf(
  request: NextRequest,
  session: ServerSession,
): boolean {
  const header = request.headers.get("x-csrf-token");
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!header || !cookie || header.length !== cookie.length) {
    return false;
  }
  const headerBuffer = Buffer.from(header);
  const cookieBuffer = Buffer.from(cookie);
  return (
    timingSafeEqual(headerBuffer, cookieBuffer) &&
    header === session.csrfToken
  );
}

export function refreshSession(sessionId: string): Promise<RefreshResult> {
  const existing = store.refreshes.get(sessionId);
  if (existing) {
    return existing;
  }

  const flight = (async (): Promise<RefreshResult> => {
    const session = getSessionById(sessionId);
    if (!session) {
      return { status: "expired" };
    }

    let upstream: Response;
    try {
      upstream = await backendFetch("/v1/auth/refresh", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
    } catch {
      return { status: "unavailable" };
    }

    if (upstream.status === 401 || upstream.status === 403) {
      deleteSession(sessionId);
      return { status: "expired" };
    }
    if (!upstream.ok) {
      return { status: "unavailable" };
    }

    let tokens: TokenResponse;
    try {
      tokens = (await upstream.json()) as TokenResponse;
    } catch {
      return { status: "unavailable" };
    }
    if (!tokens.access_token || !tokens.refresh_token) {
      return { status: "unavailable" };
    }

    const current = store.sessions.get(sessionId);
    if (!current) {
      return { status: "expired" };
    }
    current.accessToken = tokens.access_token;
    current.refreshToken = tokens.refresh_token;
    current.refreshExpiresAt =
      Date.now() + refreshLifetimeSeconds(tokens) * 1000;

    return { status: "ok", tokens, session: current };
  })();

  store.refreshes.set(sessionId, flight);
  const cleanup = () => {
    if (store.refreshes.get(sessionId) === flight) {
      store.refreshes.delete(sessionId);
    }
  };
  void flight.then(cleanup, cleanup);
  return flight;
}
