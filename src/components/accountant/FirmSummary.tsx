import type { ReactNode } from "react";
import type { Firm } from "@/lib/types";

type FirmSummaryProps = {
  firm: Firm | null;
  clientCount: number;
  clientHint: string;
  memberCount: number;
  memberHint: string;
};

function SummaryCard({
  label,
  value,
  hint,
  icon,
  valueClassName = "text-lg font-bold leading-7",
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
        >
          {icon}
        </span>
      </div>
      <dd>
        <span
          className={`mt-2 block break-words text-slate-900 ${valueClassName}`}
        >
          {value}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      </dd>
    </div>
  );
}

export default function FirmSummary({
  firm,
  clientCount,
  clientHint,
  memberCount,
  memberHint,
}: FirmSummaryProps) {
  return (
    <section aria-labelledby="firm-summary-title">
      <h2 id="firm-summary-title" className="sr-only">
        Resumen de la firma
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Firma"
          value={firm?.name ?? "—"}
          hint="Información general de la firma"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21h18M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M9 7h3M9 11h3M9 15h3m5 6V9h3a2 2 0 0 1 2 2v10"
              />
            </svg>
          }
        />
        <SummaryCard
          label="NIT"
          value={firm?.nit?.trim() || "Sin registrar"}
          hint="Identificación tributaria de la firma"
          valueClassName="text-lg font-bold leading-7 tabular-nums"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 4h6a2 2 0 0 1 2 2v14l-3-1.5L12 20l-2-1.5L7 20V6a2 2 0 0 1 2-2Zm0 4h6m-6 4h6"
              />
            </svg>
          }
        />
        <SummaryCard
          label={clientCount === 1 ? "Cliente" : "Clientes"}
          value={clientCount}
          hint={clientHint}
          valueClassName="text-3xl font-bold leading-9 tabular-nums"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              />
            </svg>
          }
        />
        <SummaryCard
          label={memberCount === 1 ? "Miembro" : "Miembros"}
          value={memberCount}
          hint={memberHint}
          valueClassName="text-3xl font-bold leading-9 tabular-nums"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a3 3 0 1 0 0-6m4 16v-2a4 4 0 0 0-3-3.87"
              />
            </svg>
          }
        />
      </dl>
    </section>
  );
}
