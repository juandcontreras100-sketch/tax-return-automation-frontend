import type { FormValue } from "@/lib/types";

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

function formatValue(value: FormValue): string {
  if (value.value_numeric !== null && value.value_numeric !== undefined) {
    const numeric = Number(value.value_numeric);
    if (Number.isFinite(numeric)) {
      return numberFormatter.format(numeric);
    }
    return String(value.value_numeric);
  }

  const text = value.value_text?.trim();
  return text ? text : "—";
}

function confidencePercent(
  confidence: number | null | undefined,
): number | null {
  if (confidence === null || confidence === undefined) {
    return null;
  }

  const numeric = Number(confidence);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function confidenceColor(percent: number): string {
  if (percent >= 85) {
    return "bg-emerald-500";
  }
  if (percent >= 60) {
    return "bg-amber-500";
  }
  return "bg-rose-500";
}

export default function FormValuesTable({
  values,
}: {
  values: FormValue[] | null | undefined;
}) {
  const rows = values ?? [];

  if (rows.length === 0) {
    return (
      <section
        aria-labelledby="form-values-title"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2
            id="form-values-title"
            className="text-lg font-bold text-slate-900"
          >
            Casillas del formulario
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Aún no hay valores asociados a esta declaración.
          </p>
        </div>

        <div className="px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h3m-6 5h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
              />
            </svg>
          </span>
          <h3 className="mt-4 text-base font-bold text-slate-900">
            Sin casillas registradas
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Esta declaración todavía no tiene casillas con valores. Si acabas
            de cargar documentos, espera a que termine el procesamiento y
            pulsa «Actualizar».
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="form-values-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <h2
            id="form-values-title"
            className="text-lg font-bold text-slate-900"
          >
            Casillas del formulario
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Valores registrados para el Formulario 210.
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          {rows.length} {rows.length === 1 ? "casilla" : "casillas"}
        </p>
      </div>

      <div
        className="overflow-x-auto focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-indigo-500/30"
        role="region"
        aria-label="Tabla de casillas de la declaración"
        tabIndex={0}
      >
        <table
          className="min-w-[44rem] divide-y divide-slate-200 text-left text-sm"
          aria-describedby="form-values-help"
        >
          <caption className="sr-only">
            Casillas del Formulario 210 con número de caja, nombre, valor,
            confianza y origen del dato.
          </caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th
                scope="col"
                className="whitespace-nowrap px-5 py-3 font-semibold sm:px-6"
              >
                Caja
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Nombre
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-right font-semibold"
              >
                Valor
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 font-semibold"
              >
                Confianza
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 font-semibold"
              >
                Origen
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((value, index) => {
              const percent = confidencePercent(value.confidence);

              return (
                <tr
                  key={`${value.field_code}-${value.box_number ?? "sin-caja"}-${index}`}
                  className="align-top transition hover:bg-slate-50/70"
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-slate-700 sm:px-6">
                    {value.box_number ?? (
                      <>
                        <span aria-hidden="true" className="text-slate-400">
                          —
                        </span>
                        <span className="sr-only">Sin caja</span>
                      </>
                    )}
                  </td>

                  <td className="min-w-48 px-4 py-3.5">
                    <p className="font-semibold text-slate-900">
                      {value.field_name || value.field_code || "Sin nombre"}
                    </p>
                    {value.field_code &&
                      value.field_code !== value.field_name && (
                        <p className="mt-0.5 font-mono text-xs text-slate-400">
                          {value.field_code}
                        </p>
                      )}
                  </td>

                  <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-800">
                    {formatValue(value)}
                  </td>

                  <td className="px-4 py-3.5">
                    {percent === null ? (
                      <>
                        <span aria-hidden="true" className="text-slate-400">
                          —
                        </span>
                        <span className="sr-only">Sin dato</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700">
                          {percentFormatter.format(percent)}%
                        </span>
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"
                        >
                          <span
                            className={`block h-full rounded-full ${confidenceColor(percent)}`}
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        value.is_manually_entered
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {value.is_manually_entered ? "Manual" : "Extraído"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p
        id="form-values-help"
        className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs leading-5 text-slate-500 sm:px-6"
      >
        La confianza indica la seguridad de la extracción automática. Un valor
        manual fue ingresado o corregido por una persona.
      </p>
    </section>
  );
}
