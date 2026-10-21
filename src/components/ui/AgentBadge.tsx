type AgentStatus = "pending" | "running" | "ready" | "review" | "error";

const statusClasses: Record<AgentStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  running: "bg-indigo-50 text-indigo-700 animate-pulse",
  ready: "bg-emerald-50 text-emerald-700",
  review: "bg-amber-50 text-amber-700",
  error: "bg-rose-50 text-rose-700",
};

const statusLabels: Record<AgentStatus, string> = {
  pending: "Pendiente",
  running: "Ejecutando",
  ready: "Listo",
  review: "Revisión",
  error: "Error",
};

export type { AgentStatus };

export default function AgentBadge({ status }: { status: AgentStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>{statusLabels[status]}</span>;
}
