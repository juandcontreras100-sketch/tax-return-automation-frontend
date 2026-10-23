"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  refresh as apiRefresh,
  register as apiRegister,
  setSessionAdapter,
} from "./api";
import type {
  RegisterPayload,
  TokenResponse,
  User,
  UserRole,
} from "./types";

const STORAGE_KEY = "taxfrom.session.v1";

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: User | null;
};

type AuthSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  ready: boolean;
};

type AuthContextValue = AuthSnapshot & {
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: (redirectTo?: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.email === "string" &&
    typeof record.first_name === "string" &&
    typeof record.last_name === "string" &&
    (record.role === "taxpayer" ||
      record.role === "accountant" ||
      record.role === "admin")
  );
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredSession> | null;
    if (
      !parsed ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string"
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: isUser(parsed.user) ? parsed.user : null,
    };
  } catch {
    return null;
  }
}

function writeStoredSession(snapshot: StoredSession): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // sessionStorage puede estar bloqueado (modo privado); la sesión sigue en memoria.
  }
}

function removeStoredSession(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible no hay nada que limpiar.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({
    accessToken: null,
    refreshToken: null,
    user: null,
    ready: false,
  });
  const snapshotRef = useRef<AuthSnapshot>(snapshot);

  const commit = useCallback((next: AuthSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);

    if (next.accessToken && next.refreshToken) {
      writeStoredSession({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        user: next.user,
      });
    } else {
      removeStoredSession();
    }
  }, []);

  const clearSession = useCallback(() => {
    commit({
      accessToken: null,
      refreshToken: null,
      user: null,
      ready: true,
    });
  }, [commit]);

  const applyTokens = useCallback(
    (tokens: TokenResponse) => {
      const current = snapshotRef.current;
      const user = current.user
        ? {
            ...current.user,
            email: tokens.email,
            first_name: tokens.first_name,
            last_name: tokens.last_name,
          }
        : null;

      commit({
        ...current,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user,
      });
    },
    [commit],
  );

  useEffect(() => {
    setSessionAdapter({
      getRefreshToken: () => snapshotRef.current.refreshToken,
      onTokensRefreshed: applyTokens,
      onSessionExpired: clearSession,
    });

    return () => setSessionAdapter(null);
  }, [applyTokens, clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // Se difiere un microtask para no encadenar renders síncronos desde el
      // efecto; la sesión vive en sessionStorage (sistema externo a React).
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      const stored = readStoredSession();

      if (!stored) {
        commit({
          accessToken: null,
          refreshToken: null,
          user: null,
          ready: true,
        });
        return;
      }

      // Los tokens deben quedar disponibles antes de validar la sesión para que
      // el cliente HTTP pueda refrescar un access token vencido.
      commit({
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        user: stored.user,
        ready: false,
      });

      try {
        const user = await apiMe(stored.accessToken);
        if (cancelled) {
          return;
        }
        const current = snapshotRef.current;
        commit({
          ...current,
          user,
          ready: true,
        });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          return;
        }
        // Un fallo de red no debe borrar una sesión válida almacenada.
        commit({ ...snapshotRef.current, ready: true });
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [clearSession, commit]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const tokens = await apiLogin(email.trim(), password);

      commit({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: null,
        ready: false,
      });

      try {
        const user = await apiMe(tokens.access_token);
        const current = snapshotRef.current;
        commit({
          ...current,
          user,
          ready: true,
        });
        return user;
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [clearSession, commit],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      await apiRegister(payload);
      return login(payload.email, payload.password);
    },
    [login],
  );

  const logout = useCallback(async (redirectTo = "/login"): Promise<void> => {
    const refreshToken = snapshotRef.current.refreshToken;

    clearSession();
    router.replace(redirectTo);

    if (refreshToken) {
      try {
        await apiLogout(refreshToken);
      } catch {
        // La sesión local ya se cerró; revocar en el servidor es best-effort.
      }
    }
  }, [clearSession, router]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = snapshotRef.current.refreshToken;
    if (!refreshToken) {
      clearSession();
      return false;
    }

    try {
      const tokens = await apiRefresh(refreshToken);
      applyTokens(tokens);
      const user = await apiMe(tokens.access_token);
      const current = snapshotRef.current;
      commit({ ...current, user, ready: true });
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [applyTokens, clearSession, commit]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...snapshot,
      login,
      register,
      logout,
      refreshSession,
    }),
    [login, logout, refreshSession, register, snapshot],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  }
  return context;
}

/**
 * Protege una página cliente. Mientras `ready` es false no redirige, para no
 * expulsar al usuario antes de recuperar la sesión de sessionStorage.
 */
export function useRequireAuth(options?: { roles?: UserRole[] }) {
  const auth = useAuth();
  const router = useRouter();
  const rolesKey = options?.roles?.join(",") ?? "";

  useEffect(() => {
    if (!auth.ready) {
      return;
    }
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    const allowedRoles = rolesKey
      ? (rolesKey.split(",") as UserRole[])
      : null;
    if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
      router.replace("/dashboard");
    }
  }, [auth.ready, auth.user, rolesKey, router]);

  const allowedRoles = rolesKey ? (rolesKey.split(",") as UserRole[]) : null;
  const authorized =
    auth.ready &&
    auth.user !== null &&
    (!allowedRoles || allowedRoles.includes(auth.user.role));

  return { ...auth, authorized };
}
