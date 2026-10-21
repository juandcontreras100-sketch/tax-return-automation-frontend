import Link from "next/link";
import type { TaxYear } from "./wizard-config";

type NotRequiredScreenProps = {
  taxYear: TaxYear;
  onReview: () => void;
};

export default function NotRequiredScreen({
  taxYear,
  onReview,
}: NotRequiredScreenProps) {
  return (
    <section
      aria-labelledby="not-required-title"
      className="px-1 py-4 text-center sm:py-8"
    >
      <span
        aria-hidden="true"
        className="mx-auto flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-8 ring-indigo-50/50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3.5 20 7v5.2c0 4.3-2.9 7.5-8 8.8-5.1-1.3-8-4.5-8-8.8V7l8-3.5Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9 12 2 2 4-4"
          />
        </svg>
      </span>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
        No necesitas declarar
      </p>
      <h2
        id="not-required-title"
        tabIndex={-1}
        className="mx-auto mt-2 max-w-xl text-2xl font-bold tracking-tight text-slate-900 focus:outline-none sm:text-3xl"
      >
        Con estas respuestas no estás obligado a presentar la declaración de
        renta {taxYear}.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        Marcaste{" "}
        <span className="font-semibold text-slate-800">
          «Ninguna de las anteriores / No declaro»
        </span>
        . Por eso no creamos ninguna declaración ni enviamos tus documentos.
      </p>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left text-sm leading-6 text-slate-600">
        <p className="font-semibold text-slate-800">
          Si tu situación cambia
        </p>
        <p className="mt-1">
          Puedes volver más adelante y crear una declaración cuando cumplas
          alguna de las causales. Tus respuestas de esta sesión no se guardaron.
        </p>
      </div>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 sm:w-auto"
        >
          Volver al dashboard
        </Link>
        <button
          type="button"
          onClick={onReview}
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 sm:w-auto"
        >
          Cambiar mis respuestas
        </button>
      </div>
    </section>
  );
}
