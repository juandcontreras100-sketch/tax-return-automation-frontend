import type { WizardStep } from "./wizard-config";

const steps: ReadonlyArray<{
  step: WizardStep;
  label: string;
  description: string;
}> = [
  {
    step: 1,
    label: "Año y causales",
    description: "Periodo y motivo de la declaración",
  },
  {
    step: 2,
    label: "Documentos",
    description: "RUT, ingresos y extractos",
  },
  {
    step: 3,
    label: "Revisión",
    description: "Verifica y envía",
  },
];

type WizardProgressProps = {
  currentStep: WizardStep;
  onNavigate: (step: WizardStep) => void;
};

export default function WizardProgress({
  currentStep,
  onNavigate,
}: WizardProgressProps) {
  return (
    <nav aria-label="Progreso de la declaración">
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {steps.map(({ step, label, description }) => {
          const isCurrent = step === currentStep;
          const isCompleted = step < currentStep;

          const content = (
            <>
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent
                    ? "bg-white text-indigo-700"
                    : isCompleted
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.293a1 1 0 0 1 .003 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.793 2.793 6.79-6.79a1 1 0 0 1 1.414-.003Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step
                )}
              </span>

              <span className="min-w-0">
                <span
                  className={`block text-[11px] font-semibold uppercase tracking-wide ${
                    isCurrent
                      ? "text-indigo-100"
                      : isCompleted
                        ? "text-indigo-600"
                        : "text-slate-400"
                  }`}
                >
                  Paso {step}
                </span>
                <span
                  className={`block truncate text-xs font-bold sm:text-sm ${
                    isCurrent
                      ? "text-white"
                      : isCompleted
                        ? "text-slate-900"
                        : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`mt-0.5 hidden truncate text-xs sm:block ${
                    isCurrent ? "text-indigo-100" : "text-slate-500"
                  }`}
                >
                  {description}
                </span>
              </span>
            </>
          );

          const sharedClassName =
            "flex w-full items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition sm:gap-3 sm:px-4";

          return (
            <li key={step}>
              {isCompleted ? (
                <button
                  type="button"
                  onClick={() => onNavigate(step)}
                  aria-label={`Volver al paso ${step}: ${label}`}
                  className={`${sharedClassName} border-indigo-200 bg-white text-slate-900 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30`}
                >
                  {content}
                </button>
              ) : (
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={`${sharedClassName} ${
                    isCurrent
                      ? "border-indigo-600 bg-indigo-600 shadow-sm"
                      : "border-slate-200 bg-white/70"
                  }`}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
