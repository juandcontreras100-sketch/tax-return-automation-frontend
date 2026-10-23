const FALLBACK_PATH = "/dashboard";

/**
 * Acepta solo rutas internas para el parámetro `next`. Evita redirecciones
 * abiertas y bucles de vuelta al login.
 */
export function safeInternalPath(
  value: string | null,
  fallback = FALLBACK_PATH,
): string {
  if (!value) {
    return fallback;
  }

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\")
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "http://localhost");
    if (url.origin !== "http://localhost") {
      return fallback;
    }
    if (url.pathname === "/login") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
