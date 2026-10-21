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
  pending: "Pendiente",
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  in_review: "bg-amber-50 text-amber-800 ring-amber-200",
  ready_to_file: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  filed: "bg-sky-50 text-sky-700 ring-sky-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  amended: "bg-violet-50 text-violet-700 ring-violet-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
  processing: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  pending: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function statusLabel(status: string): string {
  const normalized = status?.trim() ?? "";
  if (!normalized) {
    return "Sin estado";
  }

  const known = statusLabels[normalized];
  if (known) {
    return known;
  }

  const readable = normalized.replaceAll("_", " ");
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusStyles[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {statusLabel(status)}
    </span>
  );
}
