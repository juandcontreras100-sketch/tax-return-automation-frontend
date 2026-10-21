import type { ReactNode } from "react";

export type ProcessingStatusTone =
  | "info"
  | "success"
  | "warning"
  | "error";

type ProcessingStatusProps = {
  tone: ProcessingStatusTone;
  title: string;
  description: string;
  footnote?: string | null;
  busy?: boolean;
};

const toneStyles: Record<
  ProcessingStatusTone,
  { container: string; icon: string; title: string; body: string }
> = {
  info: {
    container: "border-indigo-200 bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-700",
    title: "text-indigo-950",
    body: "text-indigo-800",
  },
  success: {
    container: "border-emerald-200 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
    title: "text-emerald-950",
    body: "text-emerald-800",
  },
  warning: {
    container: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-800",
    title: "text-amber-950",
    body: "text-amber-900",
  },
  error: {
    container: "border-rose-200 bg-rose-50",
    icon: "bg-rose-100 text-rose-700",
    title: "text-rose-950",
    body: "text-rose-800",
  },
};

function StatusIcon({
  tone,
  busy,
}: {
  tone: ProcessingStatusTone;
  busy: boolean;
}): ReactNode {
  if (busy) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="size-4 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          d="M12 3a9 9 0 1 0 9 9"
        />
      </svg>
    );
  }

  if (tone === "success") {
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

  return (
    <span aria-hidden="true" className="text-sm font-black leading-none">
      {tone === "error" ? "×" : tone === "warning" ? "!" : "i"}
    </span>
  );
}

export default function ProcessingStatus({
  tone,
  title,
  description,
  footnote,
  busy = false,
}: ProcessingStatusProps) {
  const styles = toneStyles[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex gap-3 rounded-2xl border p-5 shadow-sm ${styles.container}`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
      >
        <StatusIcon tone={tone} busy={busy} />
      </span>

      <div className="min-w-0">
        <p className={`text-sm font-bold leading-5 ${styles.title}`}>{title}</p>
        <p className={`mt-1 text-sm leading-6 ${styles.body}`}>{description}</p>
        {footnote ? (
          <p className={`mt-2 text-xs font-medium leading-5 ${styles.body}`}>
            {footnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
