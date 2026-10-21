"use client";

import { useId } from "react";
import {
  CAUSAL_OPTIONS,
  TAX_YEARS,
  type CausalValue,
  type TaxYear,
} from "./wizard-config";

type YearReasonsStepProps = {
  taxYear: TaxYear;
  onTaxYearChange: (year: TaxYear) => void;
  selectedReasons: readonly CausalValue[];
  onToggleReason: (reason: CausalValue) => void;
  error: string | null;
};

export default function YearReasonsStep({
  taxYear,
  onTaxYearChange,
  selectedReasons,
  onToggleReason,
  error,
}: YearReasonsStepProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const yearHelpId = `${id}-year-help`;
  const reasonsHelpId = `${id}-reasons-help`;
  const errorId = `${id}-error`;

  const causalOptions = CAUSAL_OPTIONS.filter(
    (option) => option.value !== "none",
  );
  const noneOption = CAUSAL_OPTIONS.find((option) => option.value === "none");

  return (
    <section aria-labelledby={titleId}>
      <h2
        id={titleId}
        tabIndex={-1}
        className="text-xl font-bold tracking-tight text-slate-900 focus:outline-none sm:text-2xl"
      >
        Año gravable y causales
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Cuéntanos qué año vas a declarar y por qué estás obligado a presentar
        la declaración de renta.
      </p>

      <fieldset className="mt-7" aria-describedby={yearHelpId}>
        <legend className="text-base font-bold text-slate-900">
          Año gravable
        </legend>
        <p id={yearHelpId} className="mt-1 text-sm text-slate-500">
          Por defecto seleccionamos 2025. Puedes cambiarlo si tu declaración
          corresponde a otro periodo.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TAX_YEARS.map((year) => {
            const checked = taxYear === year;
            return (
              <label
                key={year}
                className={`relative flex cursor-pointer flex-col rounded-xl border px-4 py-3.5 transition focus-within:ring-4 focus-within:ring-indigo-500/25 ${
                  checked
                    ? "border-indigo-500 bg-indigo-50/70 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="tax_year"
                  value={year}
                  checked={checked}
                  onChange={() => onTaxYearChange(year)}
                  className="sr-only"
                />
                <span
                  className={`text-xl font-bold tabular-nums ${
                    checked ? "text-indigo-700" : "text-slate-900"
                  }`}
                >
                  {year}
                </span>
                <span className="mt-0.5 text-xs font-medium text-slate-500">
                  {year === 2025 ? "Año predeterminado" : "Año gravable"}
                </span>
                {checked && (
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="size-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.293a1 1 0 0 1 .003 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.793 2.793 6.79-6.79a1 1 0 0 1 1.414-.003Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset
        className="mt-8"
        aria-describedby={
          error ? `${reasonsHelpId} ${errorId}` : reasonsHelpId
        }
      >
        <legend className="text-base font-bold text-slate-900">
          ¿Por qué estás obligado a declarar?
        </legend>
        <p id={reasonsHelpId} className="mt-1 text-sm text-slate-500">
          Marca todas las causales que apliquen. Si no cumples ninguna,
          selecciona la última opción.
        </p>

        <div className="mt-3 space-y-2.5">
          {causalOptions.map((option) => {
            const checked = selectedReasons.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition focus-within:ring-4 focus-within:ring-indigo-500/25 ${
                  checked
                    ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  name="declaration_reasons"
                  value={option.value}
                  checked={checked}
                  onChange={() => onToggleReason(option.value)}
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-sm leading-6 text-slate-600">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}

          {noneOption && (
            <div className="pt-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border border-dashed p-4 transition focus-within:ring-4 focus-within:ring-indigo-500/25 ${
                  selectedReasons.includes(noneOption.value)
                    ? "border-indigo-500 bg-indigo-50/60"
                    : "border-slate-300 bg-slate-50/80 hover:border-slate-400 hover:bg-slate-100/80"
                }`}
              >
                <input
                  type="checkbox"
                  name="declaration_reasons"
                  value={noneOption.value}
                  checked={selectedReasons.includes(noneOption.value)}
                  onChange={() => onToggleReason(noneOption.value)}
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {noneOption.label}
                  </span>
                  <span className="mt-0.5 block text-sm leading-6 text-slate-600">
                    {noneOption.description}
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>
      </fieldset>

      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-5 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold"
          >
            !
          </span>
          <p className="leading-5">{error}</p>
        </div>
      )}
    </section>
  );
}
