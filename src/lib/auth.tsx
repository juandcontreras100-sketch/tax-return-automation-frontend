"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  register as apiRegister,
  setSessionExpiredHandler,
} from "./api";
import type { RegisterPayload, User, UserRole } from "./types";

type AuthSnapshot = {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({
    user: null,
    ready: false,
  });

  const commit = useCallback((next: AuthSnapshot) => {
    setSnapshot(next);
  }, []);

  const clearSession = useCallback(() => {
    commit({ user: null, ready: true });
  }, [commit]);

  // El BFF responde 401 cuando la sesión ya no existe. El cliente HTTP avisa
  // aquí para que la UI vuelva al login sin exponer tokens ni refresh tokens.
  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // Se difiere un microtask para no encadenar renders síncronos desde el
      // efecto; la cookie de sesión es un sistema externo a React.
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      try {
        const user = await apiMe();
        if (cancelled) {
          return;
        }
        if (isUser(user)) {
          commit({ user, ready: true });
        } else {
          clearSession();
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [clearSession, commit]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const user = await apiLogin(email.trim(), password);
      if (!isUser(user)) {
        clearSession();
        throw new Error("El servidor devolvió un usuario no válido.");
      }
      commit({ user, ready: true });
      return user;
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

  const logout = useCallback(
    async (redirectTo = "/login"): Promise<void> => {
      try {
        await apiLogout();
      } catch {
        // Si el BFF no responde, igual limpiamos el estado local y navegamos.
      }
      clearSession();
      router.replace(redirectTo);
    },
    [clearSession, router],
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const user = await apiMe();
      if (!isUser(user)) {
        clearSession();
        return false;
      }
      commit({ user, ready: true });
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession, commit]);

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
 * expulsar al usuario antes de que el BFF recupere la sesión desde su cookie.
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
