import Link from "next/link";
import StatusBadge from "@/components/results/StatusBadge";
import type { DeclarationListItem } from "@/lib/types";
import { balanceInfo } from "./helpers";

export type ClientDeclarationsState =
  | { status: "loading" }
  | { status: "deferred" }
  | { status: "error"; message: string }
  | { status: "ready"; items: DeclarationListItem[]; total: number };

type ClientDeclarationsProps = {
  clientName: string;
  state: ClientDeclarationsState | undefined;
  onRetry: () => void;
  emptyMessage?: string;
};

export default function ClientDeclarations({
  clientName,
  state,
  onRetry,
  emptyMessage = "Sin declaraciones registradas.",
}: ClientDeclarationsProps) {
  const listLabel = `Declaraciones de ${clientName}`;

  if (!state || state.status === "loading") {
    return (
      <div role="status" aria-label={listLabel} className="space-y-2">
        <div className="h-6 w-full animate-pulse rounded-md bg-slate-100" />
        <div className="h-6 w-4/5 animate-pulse rounded-md bg-slate-100" />
        <span className="sr-only">Cargando declaraciones de {clientName}…</span>
      </div>
    );
  }

  if (state.status === "deferred") {
    return (
      <p className="text-xs leading-5 text-slate-500">
        Declaraciones no incluidas en esta vista.
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
      >
        <p>{state.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-rose-300 bg-white px-2 py-1 font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <p className="text-xs leading-5 text-slate-500">{emptyMessage}</p>
    );
  }

  return (
    <div>
      <ul aria-label={listLabel} className="space-y-2">
        {state.items.map((item) => {
          const balance = balanceInfo(item);

          return (
            <li
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs font-bold text-slate-800">
                  {item.tax_year}
                </span>
                <StatusBadge status={item.status} />
                <span
                  className={`text-xs font-semibold tabular-nums ${balance.className}`}
                >
                  {balance.label}: {balance.value}
                </span>
              </div>
              <Link
                href={`/declarations/${item.id}`}
                aria-label={`Ver declaración ${item.tax_year} de ${clientName}`}
                className="mt-1 inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-indigo-600 underline-offset-4 transition hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
              >
                Ver declaración <span aria-hidden="true">→</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {state.total > state.items.length && (
        <p className="mt-2 text-xs text-slate-500">
          Mostrando {state.items.length} de {state.total} declaraciones
          recientes.
        </p>
      )}
    </div>
  );
}
