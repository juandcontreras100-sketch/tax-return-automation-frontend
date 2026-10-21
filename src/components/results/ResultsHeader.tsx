import Link from "next/link";
import type { DeclarationDetail } from "@/lib/types";
import StatusBadge from "./StatusBadge";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

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

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

type ResultsHeaderProps = {
  declaration: DeclarationDetail;
  refreshing: boolean;
  downloading: boolean;
  onRefresh: () => void;
  onDownload: () => void;
};

export default function ResultsHeader({
  declaration,
  refreshing,
  downloading,
  onRefresh,
  onDownload,
}: ResultsHeaderProps) {
  return (
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-indigo-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 12H5m7 7-7-7 7-7"
            />
          </svg>
          Volver al dashboard
        </Link>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
          Resultado de la declaración
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={declaration.status} />
            <span className="text-sm font-medium text-indigo-100">
              Formulario 210
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Declaración de renta
          </h1>
          <p className="mt-1.5 text-sm font-medium text-indigo-100">
            Año gravable {declaration.tax_year}
          </p>

          <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-indigo-100">
            <div className="flex items-center gap-1.5">
              <dt className="font-semibold text-white">Creada:</dt>
              <dd>{formatDate(declaration.created_at)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="font-semibold text-white">Actualizada:</dt>
              <dd>{formatDate(declaration.updated_at)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="font-semibold text-white">ID:</dt>
              <dd>
                <code
                  title={declaration.id}
                  aria-label={`ID completo: ${declaration.id}`}
                  className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-xs tracking-wide text-white ring-1 ring-inset ring-white/20"
                >
                  {shortId(declaration.id)}
                </code>
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            aria-busy={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              />
            </svg>
            {downloading ? "Descargando…" : "Descargar PDF"}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 11a8 8 0 0 0-14.9-4M4 5v6h6m-6 2a8 8 0 0 0 14.9 4M20 19v-6h-6"
              />
            </svg>
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>
    </header>
  );
}
