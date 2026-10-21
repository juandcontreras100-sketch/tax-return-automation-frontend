type ReviewNoticeProps = {
  status: string;
  observations: string | null | undefined;
};

export default function ReviewNotice({
  status,
  observations,
}: ReviewNoticeProps) {
  const inReview = status === "in_review";
  const note = observations?.trim() ?? "";

  if (!inReview && !note) {
    return null;
  }

  const title = inReview
    ? note
      ? "Revisión del contador en curso"
      : "En revisión por un contador"
    : "Observaciones de la declaración";

  return (
    <section
      aria-labelledby="review-notice-title"
      className={`rounded-2xl border p-5 sm:p-6 ${
        inReview
          ? "border-amber-200 bg-amber-50"
          : "border-sky-200 bg-sky-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            inReview
              ? "bg-amber-100 text-amber-700"
              : "bg-sky-100 text-sky-700"
          }`}
        >
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
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            />
          </svg>
        </span>

        <div className="min-w-0">
          <h2
            id="review-notice-title"
            className={`text-base font-bold ${
              inReview ? "text-amber-900" : "text-sky-900"
            }`}
          >
            {title}
          </h2>

          <p
            className={`mt-1 text-sm leading-6 ${
              inReview ? "text-amber-900/90" : "text-sky-900/90"
            }`}
          >
            {inReview
              ? "Un contador está verificando las casillas y los valores antes de que presentes tu declaración. Es un control de calidad: se validan los datos extraídos, se corrigen inconsistencias y se confirma que el Formulario 210 esté listo."
              : "Estas observaciones las dejó un contador durante la revisión. Revísalas y corrige la información si es necesario antes de presentar tu declaración."}
          </p>

          {inReview && !note && (
            <p className="mt-2 text-sm leading-6 text-amber-900/90">
              Cuando termine la revisión, el estado de la declaración se
              actualizará. Puedes usar «Actualizar» para consultar los cambios.
            </p>
          )}

          {note && (
            <div className="mt-4 rounded-xl border border-white/80 bg-white/75 p-4">
              <h3
                className={`text-xs font-bold uppercase tracking-wide ${
                  inReview ? "text-amber-800" : "text-sky-800"
                }`}
              >
                Observaciones
              </h3>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
                {note}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
