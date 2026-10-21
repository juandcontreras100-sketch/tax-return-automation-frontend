import DocumentUpload from "./DocumentUpload";
import {
  DOCUMENT_DEFINITIONS,
  requiredDocumentsProgress,
  type DocumentCategory,
  type DocumentErrors,
  type SelectedDocuments,
} from "./wizard-config";

type DocumentsStepProps = {
  documents: SelectedDocuments;
  errors: DocumentErrors;
  stepError: string | null;
  onFilesSelected: (category: DocumentCategory, files: File[]) => void;
  onRemove: (category: DocumentCategory, index: number) => void;
};

export default function DocumentsStep({
  documents,
  errors,
  stepError,
  onFilesSelected,
  onRemove,
}: DocumentsStepProps) {
  const progress = requiredDocumentsProgress(documents);
  const complete = progress.ready === progress.total;

  return (
    <section aria-labelledby="documents-step-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="documents-step-title"
            tabIndex={-1}
            className="text-xl font-bold tracking-tight text-slate-900 focus:outline-none sm:text-2xl"
          >
            Documentos de soporte
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Adjunta los documentos del año gravable. Los revisaremos de forma
            automática para extraer la información de tu declaración.
          </p>
        </div>

        <span
          className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${
            complete
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {progress.ready} de {progress.total} obligatorios listos
        </span>
      </div>

      <div className="mt-5 flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-6 text-indigo-900">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="mt-0.5 size-5 shrink-0 text-indigo-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3.5 20 7v5.2c0 4.3-2.9 7.5-8 8.8-5.1-1.3-8-4.5-8-8.8V7l8-3.5Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.8 12.2 2.2 2.2 4.4-4.4"
          />
        </svg>
        <p>
          <span className="font-semibold">RUT y certificado de ingresos son
          obligatorios.</span>{" "}
          Los extractos bancarios son opcionales. Todos los archivos deben ser
          PDF de máximo 10 MB.
        </p>
      </div>

      {stepError && (
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
          <p className="leading-5 break-words">{stepError}</p>
        </div>
      )}

      <div className="mt-5 space-y-3.5">
        {DOCUMENT_DEFINITIONS.map((definition) => (
          <DocumentUpload
            key={definition.category}
            definition={definition}
            files={documents[definition.category]}
            error={errors[definition.category]}
            onFilesSelected={(files) =>
              onFilesSelected(definition.category, files)
            }
            onRemove={(index) => onRemove(definition.category, index)}
          />
        ))}
      </div>
    </section>
  );
}
