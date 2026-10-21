import AgentBadge from "@/components/ui/AgentBadge";
import type { AgentStatus } from "@/components/ui/AgentBadge";
import type { AgentProgress } from "./processingState";

const markerStyles: Record<AgentStatus, string> = {
  pending: "border-slate-200 bg-white text-slate-500",
  running:
    "border-indigo-300 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-100",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  review: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

const messageStyles: Record<AgentStatus, string> = {
  pending: "bg-slate-50 text-slate-600",
  running: "bg-indigo-50 text-indigo-800",
  ready: "bg-emerald-50 text-emerald-800",
  review: "bg-amber-50 text-amber-900",
  error: "bg-rose-50 text-rose-800",
};

const lineStyles: Record<AgentStatus, string> = {
  pending: "bg-slate-200",
  running: "bg-indigo-200",
  ready: "bg-emerald-200",
  review: "bg-amber-200",
  error: "bg-rose-200",
};

function MarkerContent({
  status,
  index,
}: {
  status: AgentStatus;
  index: number;
}) {
  if (status === "running") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className="size-4 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      >
        <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
      </svg>
    );
  }

  if (status === "ready") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className="size-4"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (status === "review" || status === "error") {
    return (
      <span aria-hidden="true" className="text-sm font-black leading-none">
        {status === "error" ? "×" : "!"}
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="text-sm font-semibold tabular-nums">
      {index + 1}
    </span>
  );
}

export default function AgentTimeline({ agents }: { agents: AgentProgress[] }) {
  return (
    <ol className="space-y-0">
      {agents.map((agent, index) => {
        const isRunning = agent.status === "running";
        const isLast = index === agents.length - 1;

        return (
          <li
            key={agent.name}
            aria-current={isRunning ? "step" : undefined}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {!isLast ? (
              <span
                aria-hidden="true"
                className={`absolute left-5 top-10 -bottom-1 w-px ${lineStyles[agent.status]}`}
              />
            ) : null}

            <span
              aria-hidden="true"
              className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border shadow-sm ${markerStyles[agent.status]}`}
            >
              <MarkerContent status={agent.status} index={index} />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <h3 className="text-sm font-semibold text-slate-900">
                  <span className="sr-only">Paso {index + 1}: </span>
                  {agent.label}
                </h3>
                <AgentBadge status={agent.status} />
                {isRunning ? (
                  <span className="text-xs font-semibold text-indigo-600">
                    Paso actual
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {agent.description}
              </p>

              {agent.message ? (
                <p
                  className={`mt-2 rounded-lg px-3 py-2 text-sm leading-6 ${messageStyles[agent.status]}`}
                >
                  {agent.message}
                </p>
              ) : isRunning ? (
                <p className="mt-2 text-sm font-medium text-indigo-700">
                  Trabajando en este paso…
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
