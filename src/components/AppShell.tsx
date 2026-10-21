"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const roleLabels: Record<UserRole, string> = {
  taxpayer: "Contribuyente",
  accountant: "Contador",
  admin: "Administrador",
};

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/declarations/new", label: "Nueva declaración" },
] as const;

export function AuthLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-50 px-6"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-slate-500">Cargando tu sesión…</p>
    </div>
  );
}

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
      aria-label="Taxfrom value, ir al inicio"
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black tracking-tight text-white shadow-sm transition group-hover:bg-indigo-700"
      >
        TV
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Taxfrom <span className="text-indigo-600">value</span>
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const isAccountant = user?.role === "accountant" || user?.role === "admin";
  const links = isAccountant
    ? [...baseLinks, { href: "/accountant", label: "Contador" }]
    : [...baseLinks];

  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : "Sesión";
  const initials = user
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : "?";

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3 xl:flex-row xl:items-center xl:justify-between">
            <Brand />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-end xl:gap-6">
              <nav aria-label="Navegación principal">
                <ul className="flex flex-wrap items-center gap-1">
                  {links.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={`inline-flex rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 ${
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-100"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-5 text-slate-800">
                      {fullName}
                    </p>
                    <p className="text-xs font-medium leading-4 text-indigo-600">
                      {user ? roleLabels[user.role] : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  aria-busy={loggingOut}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                >
                  {loggingOut ? "Cerrando…" : "Cerrar sesión"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main
        id="contenido"
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {children}
      </main>
    </>
  );
}
