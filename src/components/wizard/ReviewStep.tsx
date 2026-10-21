import {
  DOCUMENT_DEFINITIONS,
  causalLabel,
  formatFileSize,
  orderedCausals,
  type CausalValue,
  type SelectedDocuments,
  type TaxYear,
} from "./wizard-config";

type ReviewStepProps = {
  taxYear: TaxYear;
  taxpayerName: string;
  reasons: readonly CausalValue[];
  documents: SelectedDocuments;
  error: string | null;
  submitting: boolean;
  onEditStep: (step: 1 | 2) => void;
};

function EditButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
    >
      Editar
    </button>
  );
}

export default function ReviewStep({
  taxYear,
  taxpayerName,
  reasons,
  documents,
  error,
  submitting,
  onEditStep,
}: ReviewStepProps) {
  const orderedReasons = orderedCausals(reasons);
  const totalFiles = DOCUMENT_DEFINITIONS.reduce(
    (total, definition) => total + documents[definition.category].length,
    0,
  );

  return (
    <section aria-labelledby="review-step-title">
      <h2
        id="review-step-title"
        tabIndex={-1}
        className="text-xl font-bold tracking-tight text-slate-900 focus:outline-none sm:text-2xl"
      >
        Revisa y envía
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Verifica que la información y los documentos sean correctos. Después de
        enviar, comenzaremos el análisis automático de tu declaración.
      </p>

      <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Año gravable
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {taxYear}
              </p>
            </div>
            <EditButton
              onClick={() => onEditStep(1)}
              disabled={submitting}
              label="Editar año gravable y causales"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contribuyente
          </p>
          <p className="mt-1 truncate text-base font-bold text-slate-900">
            {taxpayerName}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            La declaración se creará a tu nombre.
          </p>
        </div>
      </div>

      <div className="mt-3.5 rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Causales seleccionadas
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {orderedReasons.length}{" "}
              {orderedReasons.length === 1
                ? "causal registrada"
                : "causales registradas"}
            </p>
          </div>
          <EditButton
            onClick={() => onEditStep(1)}
            disabled={submitting}
            label="Editar causales de la declaración"
          />
        </div>

        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {orderedReasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-2 rounded-lg bg-indigo-50/60 px-3 py-2 text-sm leading-5 text-slate-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mt-0.5 size-4 shrink-0 text-indigo-600"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.293a1 1 0 0 1 .003 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.793 2.793 6.79-6.79a1 1 0 0 1 1.414-.003Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{causalLabel(reason)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3.5 rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Documentos</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalFiles}{" "}
              {totalFiles === 1 ? "archivo adjunto" : "archivos adjuntos"}
            </p>
          </div>
          <EditButton
            onClick={() => onEditStep(2)}
            disabled={submitting}
            label="Editar documentos adjuntos"
          />
        </div>

        <div className="mt-3 space-y-3">
          {DOCUMENT_DEFINITIONS.map((definition) => {
            const files = documents[definition.category];
            return (
              <div key={definition.category}>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {definition.shortLabel}
                  </h4>
                  <span
                    className={`text-[11px] font-medium ${
                      definition.required
                        ? "text-indigo-600"
                        : "text-slate-400"
                    }`}
                  >
                    {definition.required ? "Obligatorio" : "Opcional"}
                  </span>
                </div>

                {files.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate text-slate-700">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {formatFileSize(file.size)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-sm text-slate-400">
                    Sin archivo adjunto
                    {definition.required ? "" : " (opcional)"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-900">
        <p className="font-semibold">¿Qué pasa al enviar?</p>
        <p className="mt-1 text-indigo-800">
          Crearemos tu declaración y ejecutaremos el análisis automático de los
          documentos. Podrás seguir el progreso y revisar los resultados en la
          pantalla de procesamiento.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold"
          >
            !
          </span>
          <div>
            <p className="font-semibold">No pudimos enviar la declaración</p>
            <p className="mt-0.5 leading-5 break-words">{error}</p>
          </div>
        </div>
      )}
    </section>
  );
}
