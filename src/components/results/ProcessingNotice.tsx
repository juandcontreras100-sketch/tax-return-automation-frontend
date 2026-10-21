import Link from "next/link";

export default function ProcessingNotice({
  declarationId,
}: {
  declarationId: string;
}) {
  return (
    <section
      aria-labelledby="processing-notice-title"
      className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"
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
              d="M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </span>

        <div>
          <h2
            id="processing-notice-title"
            className="text-base font-bold text-indigo-900"
          >
            La declaración se está procesando
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-indigo-900/90">
            Estamos extrayendo y validando los datos de tus documentos.
            Consulta el progreso detallado mientras termina.
          </p>
        </div>
      </div>

      <Link
        href={`/declarations/${encodeURIComponent(declarationId)}/processing`}
        prefetch={false}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
      >
        Ver procesamiento
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
