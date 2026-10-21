"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import AppShell, { AuthLoading } from "@/components/AppShell";
import { errorMessage, listDeclarations } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import type { DeclarationListItem, Pagina, UserRole } from "@/lib/types";

const PAGE_SIZE = 10;
const availableYears = Array.from(
  { length: 3 },
  (_, index) => new Date().getFullYear() - index,
);

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  ready_to_file: "Lista para presentar",
  filed: "Presentada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  amended: "Corregida",
  cancelled: "Cancelada",
  processing: "Procesando",
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-50 text-amber-700",
  ready_to_file: "bg-indigo-50 text-indigo-700",
  filed: "bg-sky-50 text-sky-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  amended: "bg-violet-50 text-violet-700",
  cancelled: "bg-slate-100 text-slate-500",
  processing: "bg-indigo-50 text-indigo-700",
};

const roleLabels: Record<UserRole, string> = {
  taxpayer: "Contribuyente",
  accountant: "Contador",
  admin: "Administrador",
};

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

function formatCop(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  return copFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return dateFormatter.format(date);
}

function statusLabel(status: string): string {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

function balanceInfo(item: DeclarationListItem): {
  label: string;
  className: string;
} {
  const toPay = Number(item.balance_to_pay ?? 0);
  const inFavor = Number(item.balance_in_favor ?? 0);

  if (toPay > 0) {
    return {
      label: `A pagar: ${formatCop(toPay)}`,
      className: "text-rose-700",
    };
  }
  if (inFavor > 0) {
    return {
      label: `A favor: ${formatCop(inFavor)}`,
      className: "text-emerald-700",
    };
  }
  return { label: "Sin saldo", className: "text-slate-500" };
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const { user, accessToken, ready, authorized } = useRequireAuth();
  const [declarations, setDeclarations] = useState<
    Pagina<DeclarationListItem> | null
  >(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const hasFilters = Boolean(status || year);

  useEffect(() => {
    if (!ready || !authorized || !accessToken) {
      return;
    }

    let cancelled = false;
    const token = accessToken;

    async function loadDeclarations() {
      // Microtask: evita actualizar estado de forma síncrona dentro del efecto.
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await listDeclarations(token, {
          page,
          page_size: PAGE_SIZE,
          status: status || undefined,
          tax_year: year ? Number(year) : undefined,
        });
        if (!cancelled) {
          setDeclarations(result);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDeclarations();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authorized, page, ready, reloadKey, status, year]);

  function clearFilters() {
    setStatus("");
    setYear("");
    setPage(1);
  }

  if (!ready || !authorized) {
    return <AuthLoading />;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Tu panel tributario
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Hola, {user?.first_name}.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                Consulta el estado de tus declaraciones de renta, revisa los
                valores y descarga el Formulario 210 cuando esté listo.
              </p>
              <span className="mt-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
                Rol: {user ? roleLabels[user.role] : "—"}
              </span>
            </div>
            <Link
              href="/declarations/new"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              Nueva declaración
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="declarations-title"
          aria-busy={loading}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2
                id="declarations-title"
                className="text-lg font-bold text-slate-900"
              >
                Mis declaraciones
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {declarations
                  ? `${declarations.total} ${
                      declarations.total === 1
                        ? "declaración registrada"
                        : "declaraciones registradas"
                    }`
                  : "Consulta el historial de tus declaraciones."}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="status-filter"
                  className="text-xs font-semibold text-slate-600"
                >
                  Estado
                </label>
                <select
                  id="status-filter"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 sm:w-44"
                >
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="in_review">En revisión</option>
                  <option value="ready_to_file">Lista para presentar</option>
                  <option value="filed">Presentada</option>
                  <option value="accepted">Aceptada</option>
                  <option value="rejected">Rechazada</option>
                  <option value="amended">Corregida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="year-filter"
                  className="text-xs font-semibold text-slate-600"
                >
                  Año gravable
                </label>
                <select
                  id="year-filter"
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 sm:w-36"
                >
                  <option value="">Todos los años</option>
                  {availableYears.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-3 border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="self-start rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 sm:self-auto"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading && declarations && (
            <p
              role="status"
              className="border-b border-indigo-100 bg-indigo-50/70 px-5 py-2 text-xs font-medium text-indigo-700 sm:px-6"
            >
              Actualizando declaraciones…
            </p>
          )}

          {loading && !declarations && (
            <div
              className="space-y-3 p-5 sm:p-6"
              role="status"
              aria-label="Cargando declaraciones"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
              <span className="sr-only">Cargando declaraciones…</span>
            </div>
          )}

          {!loading &&
            !error &&
            declarations &&
            declarations.items.length === 0 && (
              <div className="px-6 py-12 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6.5L19 8.5V19a2 2 0 0 1-2 2Z"
                    />
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {hasFilters
                    ? "No hay declaraciones con estos filtros"
                    : "Aún no tienes declaraciones"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {hasFilters
                    ? "Prueba con otro estado o año gravable para encontrar tus declaraciones."
                    : "Crea tu primera declaración de renta y aquí podrás seguir su estado y descargar el Formulario 210."}
                </p>
                <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/declarations/new"
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                  >
                    Nueva declaración
                  </Link>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

          {declarations && declarations.items.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Año</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Ingresos brutos
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Impuesto
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Saldo
                      </th>
                      <th className="px-4 py-3 font-semibold">Creada</th>
                      <th className="px-6 py-3 text-right font-semibold">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {declarations.items.map((item) => {
                      const balance = balanceInfo(item);
                      return (
                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                            {item.tax_year}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-slate-700">
                            {formatCop(item.gross_income)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-slate-700">
                            {formatCop(item.total_tax_owed)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums ${balance.className}`}
                          >
                            {balance.label}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <Link
                              href={`/declarations/${item.id}`}
                              className="font-semibold text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline"
                            >
                              Ver detalle
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {declarations.items.map((item) => {
                  const balance = balanceInfo(item);
                  return (
                    <li key={item.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Declaración {item.tax_year}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Creada el {formatDate(item.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs font-medium text-slate-500">
                            Ingresos brutos
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">
                            {formatCop(item.gross_income)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500">
                            Saldo
                          </dt>
                          <dd
                            className={`mt-0.5 font-semibold tabular-nums ${balance.className}`}
                          >
                            {balance.label}
                          </dd>
                        </div>
                      </dl>

                      <Link
                        href={`/declarations/${item.id}`}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline"
                      >
                        Ver detalle <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {declarations.total_pages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs text-slate-500">
                    Página {declarations.page} de {declarations.total_pages} ·{" "}
                    {declarations.total}{" "}
                    {declarations.total === 1 ? "declaración" : "declaraciones"}
                  </p>
                  <div className="flex gap-2">
                    <PageButton
                      disabled={declarations.page <= 1 || loading}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Anterior
                    </PageButton>
                    <PageButton
                      disabled={
                        declarations.page >= declarations.total_pages || loading
                      }
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Siguiente
                    </PageButton>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
