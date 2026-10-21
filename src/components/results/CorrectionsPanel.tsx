"use client";

import { useState } from "react";
import { errorMessage, updateDeclarationValue } from "@/lib/api";
import type { FormValue } from "@/lib/types";

type Props = {
  token: string;
  declarationId: string;
  values: FormValue[];
  onSaved: () => void;
};

export default function CorrectionsPanel({
  token,
  declarationId,
  values,
  onSaved,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editable = values;

  async function save(value: FormValue) {
    const draft = drafts[value.field_code];
    if (draft === undefined || draft.trim() === "" || saving) {
      return;
    }

    setSaving(value.field_code);
    setSaved(null);
    setError(null);

    try {
      await updateDeclarationValue(
        token,
        declarationId,
        value.field_code,
        draft.trim(),
        value.source_document_id ?? undefined,
      );
      setSaved(value.field_code);
      setDrafts((current) => {
        const next = { ...current };
        delete next[value.field_code];
        return next;
      });
      onSaved();
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setSaving(null);
    }
  }

  if (editable.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="corrections-title"
      className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="corrections-title"
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          Corrección del contador
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          Ajusta los valores extraídos que requieran revisión. Cada cambio queda
          auditado en el backend y, cuando existe, conserva el documento de
          origen.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          Casilla corregida y guardada. La declaración se actualizó.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-indigo-200 text-left text-sm">
          <caption className="sr-only">
            Formulario para corregir casillas extraídas de la declaración.
          </caption>
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-3 py-2">
                Casilla
              </th>
              <th scope="col" className="px-3 py-2">
                Valor actual
              </th>
              <th scope="col" className="px-3 py-2">
                Nuevo valor
              </th>
              <th scope="col" className="px-3 py-2">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-100">
            {editable.map((value) => {
              const current = value.value_numeric ?? value.value_text ?? "";
              const draft = drafts[value.field_code] ?? current;
              const isSaving = saving === value.field_code;

              return (
                <tr key={value.field_code}>
                  <th scope="row" className="px-3 py-3 font-medium text-slate-900">
                    <span className="block">
                      {value.box_number ? `Caja ${value.box_number}` : value.field_name}
                    </span>
                    <span className="text-xs font-normal text-slate-500">
                      {value.field_code}
                    </span>
                  </th>
                  <td className="px-3 py-3 text-slate-600">{current || "—"}</td>
                  <td className="px-3 py-3">
                    <label className="sr-only" htmlFor={`correction-${value.field_code}`}>
                      Nuevo valor para {value.field_name}
                    </label>
                    <input
                      id={`correction-${value.field_code}`}
                      inputMode="decimal"
                      value={draft}
                      onChange={(event) =>
                        setDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [value.field_code]: event.target.value,
                        }))
                      }
                      className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => void save(value)}
                      disabled={isSaving || draft.trim() === "" || draft === current}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                    >
                      {isSaving ? "Guardando…" : "Guardar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {values.some((value) => !value.source_document_id) && (
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Las casillas calculadas sin documento de origen se guardan sin
          `document_id`; la declaración, el actor y la auditoría se conservan.
        </p>
      )}
    </section>
  );
}
