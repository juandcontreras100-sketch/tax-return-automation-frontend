"use client";

import { useId, type ChangeEvent } from "react";
import {
  MAX_FILE_SIZE_LABEL,
  formatFileSize,
  type DocumentDefinition,
} from "./wizard-config";

type DocumentUploadProps = {
  definition: DocumentDefinition;
  files: readonly File[];
  error: string | null;
  onFilesSelected: (files: File[]) => void;
  onRemove: (index: number) => void;
};

export default function DocumentUpload({
  definition,
  files,
  error,
  onFilesSelected,
  onRemove,
}: DocumentUploadProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${hintId} ${errorId}` : hintId;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    // Permite volver a elegir el mismo archivo después de quitarlo.
    event.target.value = "";
    if (selected.length > 0) {
      onFilesSelected(selected);
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-xl border p-4 transition sm:p-5 ${
        error
          ? "border-rose-300 bg-rose-50/30"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
            definition.required
              ? "bg-indigo-50 text-indigo-600"
              : "bg-slate-100 text-slate-500"
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
              d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9L14 3.5Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 3.5V9h5.5M8.5 13h7M8.5 16.5h4.5"
            />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={titleId}
              className="text-sm font-bold text-slate-900 sm:text-base"
            >
              {definition.label}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                definition.required
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {definition.required ? "Obligatorio" : "Opcional"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {definition.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          htmlFor={`${id}-file`}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-within:ring-4 focus-within:ring-indigo-500/30"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5"
            />
          </svg>
          {files.length === 0
            ? "Adjuntar PDF"
            : definition.multiple
              ? "Añadir otro PDF"
              : "Reemplazar PDF"}
          <input
            id={`${id}-file`}
            type="file"
            accept="application/pdf,.pdf"
            multiple={definition.multiple}
            required={definition.required}
            aria-required={definition.required}
            aria-labelledby={titleId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={handleChange}
            className="sr-only"
          />
        </label>

        <p id={hintId} className="text-xs leading-5 text-slate-500">
          Solo PDF · máximo {MAX_FILE_SIZE_LABEL} por archivo
          {definition.multiple ? " · puedes adjuntar varios" : ""}
        </p>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700 break-words"
        >
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-inset ring-slate-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9L14 3.5Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 3.5V9h5.5"
                  />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Quitar ${file.name}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 7h12M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7m-7 0 .7 12a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L17 7"
                  />
                </svg>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
