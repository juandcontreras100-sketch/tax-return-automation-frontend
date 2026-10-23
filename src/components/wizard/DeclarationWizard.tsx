"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createDeclaration, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
import DocumentsStep from "./DocumentsStep";
import NotRequiredScreen from "./NotRequiredScreen";
import ReviewStep from "./ReviewStep";
import WizardProgress from "./WizardProgress";
import YearReasonsStep from "./YearReasonsStep";
import {
  DEFAULT_TAX_YEAR,
  DOCUMENT_DEFINITIONS,
  createEmptyDocumentErrors,
  createEmptyDocuments,
  orderedCausals,
  validatePdfFile,
  type CausalValue,
  type DocumentCategory,
  type DocumentErrors,
  type SelectedDocuments,
  type TaxYear,
  type WizardStep,
} from "./wizard-config";

type DeclarationWizardProps = {
  user: User;
};

function isSameFile(a: File, b: File): boolean {
  return (
    a.name === b.name &&
    a.size === b.size &&
    a.lastModified === b.lastModified
  );
}

export default function DeclarationWizard({
  user,
}: DeclarationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [taxYear, setTaxYear] = useState<TaxYear>(DEFAULT_TAX_YEAR);
  const [reasons, setReasons] = useState<CausalValue[]>([]);
  const [documents, setDocuments] =
    useState<SelectedDocuments>(createEmptyDocuments);
  const [documentErrors, setDocumentErrors] =
    useState<DocumentErrors>(createEmptyDocumentErrors);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notRequired, setNotRequired] = useState(false);

  const submittingRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewKey = notRequired ? "not-required" : `step-${step}`;
  const previousViewRef = useRef("step-1");

  const taxpayerName =
    `${user.first_name} ${user.last_name}`.trim() || "Contribuyente";

  useEffect(() => {
    if (previousViewRef.current === viewKey) {
      return;
    }
    previousViewRef.current = viewKey;

    contentRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [viewKey]);

  function clearMessages() {
    setStepError(null);
    setSubmitError(null);
  }

  function handleTaxYearChange(year: TaxYear) {
    setTaxYear(year);
    clearMessages();
  }

  function handleToggleReason(reason: CausalValue) {
    clearMessages();

    if (reason === "none") {
      setReasons(["none"]);
      setNotRequired(true);
      return;
    }

    setReasons((current) => {
      const withoutNone = current.filter((value) => value !== "none");
      return withoutNone.includes(reason)
        ? withoutNone.filter((value) => value !== reason)
        : [...withoutNone, reason];
    });
  }

  function handleReviewAfterNone() {
    setReasons([]);
    setNotRequired(false);
    setStep(1);
    clearMessages();
  }

  function handleNavigate(next: WizardStep) {
    if (submittingRef.current || next >= step) {
      return;
    }
    clearMessages();
    setStep(next);
  }

  function handleBack() {
    if (step > 1) {
      handleNavigate(step === 3 ? 2 : 1);
    }
  }

  function handleContinue() {
    clearMessages();

    if (step === 1) {
      if (reasons.length === 0) {
        setStepError(
          "Selecciona al menos una causal o marca «Ninguna de las anteriores / No declaro».",
        );
        return;
      }
      if (reasons.includes("none")) {
        setNotRequired(true);
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const missing = DOCUMENT_DEFINITIONS.filter(
        (definition) =>
          definition.required && documents[definition.category].length === 0,
      ).map((definition) => definition.shortLabel);

      if (missing.length > 0) {
        setStepError(
          `Faltan documentos obligatorios: ${missing.join(
            " y ",
          )}. Adjunta los archivos en PDF para continuar.`,
        );
        return;
      }

      setStep(3);
    }
  }

  function handleFilesSelected(
    category: DocumentCategory,
    incoming: File[],
  ) {
    clearMessages();

    const definition = DOCUMENT_DEFINITIONS.find(
      (item) => item.category === category,
    );
    if (!definition || incoming.length === 0) {
      return;
    }

    const existing = definition.multiple ? documents[category] : [];
    const accepted: File[] = [];
    const problems: string[] = [];

    for (const file of incoming) {
      const problem = validatePdfFile(file);
      if (problem) {
        problems.push(`${file.name}: ${problem}`);
        continue;
      }

      const duplicate =
        existing.some((current) => isSameFile(current, file)) ||
        accepted.some((current) => isSameFile(current, file));

      if (duplicate) {
        problems.push(`${file.name}: ya está adjunto.`);
        continue;
      }

      accepted.push(file);
    }

    if (accepted.length > 0) {
      setDocuments((current) => ({
        ...current,
        [category]: definition.multiple
          ? [...current[category], ...accepted]
          : [accepted[0]],
      }));
    }

    setDocumentErrors((current) => ({
      ...current,
      [category]: problems.length > 0 ? problems.join(" ") : null,
    }));
  }

  function handleRemoveFile(category: DocumentCategory, index: number) {
    clearMessages();
    setDocuments((current) => ({
      ...current,
      [category]: current[category].filter(
        (_file, fileIndex) => fileIndex !== index,
      ),
    }));
    setDocumentErrors((current) => ({ ...current, [category]: null }));
  }

  function handleEditStep(next: 1 | 2) {
    if (submittingRef.current) {
      return;
    }
    clearMessages();
    setStep(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step !== 3 || submittingRef.current) {
      return;
    }

    if (reasons.length === 0) {
      setStep(1);
      setStepError("Selecciona al menos una causal para continuar.");
      return;
    }

    if (reasons.includes("none")) {
      setNotRequired(true);
      return;
    }

    const missing = DOCUMENT_DEFINITIONS.filter(
      (definition) =>
        definition.required && documents[definition.category].length === 0,
    ).map((definition) => definition.shortLabel);

    if (missing.length > 0) {
      setStep(2);
      setStepError(
        `Faltan documentos obligatorios: ${missing.join(" y ")}.`,
      );
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append("tax_year", String(taxYear));
    formData.append("taxpayer_name", taxpayerName);
    formData.append("questionnaire", JSON.stringify(orderedCausals(reasons)));

    for (const definition of DOCUMENT_DEFINITIONS) {
      for (const file of documents[definition.category]) {
        formData.append("files", file, file.name);
        formData.append("document_categories", definition.category);
      }
    }

    try {
      const result = await createDeclaration(formData);
      const jobKey = `taxfrom.job.${result.declaration_id}`;

      try {
        window.sessionStorage.setItem(
          jobKey,
          JSON.stringify({
            job_id: result.job_id,
            declaration_id: result.declaration_id,
          }),
        );
      } catch {
        // La pantalla de procesamiento puede recuperar el estado por API.
      }

      router.push(
        `/declarations/${encodeURIComponent(result.declaration_id)}/processing`,
      );
    } catch (cause: unknown) {
      setSubmitError(errorMessage(cause));
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Declaración de renta · Formulario 210
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Nueva declaración
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
              Completa tres pasos. Revisaremos tus documentos y te mostraremos
              el resultado antes de presentar.
            </p>
          </div>

          {!notRequired && (
            <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
              Paso {step} de 3
            </span>
          )}
        </div>
      </header>

      {!notRequired && (
        <WizardProgress currentStep={step} onNavigate={handleNavigate} />
      )}

      <div
        ref={contentRef}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {notRequired ? (
          <div className="px-5 py-5 sm:px-8 sm:py-7">
            <NotRequiredScreen
              taxYear={taxYear}
              onReview={handleReviewAfterNone}
            />
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit}>
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              {step === 1 && (
                <YearReasonsStep
                  taxYear={taxYear}
                  onTaxYearChange={handleTaxYearChange}
                  selectedReasons={reasons}
                  onToggleReason={handleToggleReason}
                  error={stepError}
                />
              )}

              {step === 2 && (
                <DocumentsStep
                  documents={documents}
                  errors={documentErrors}
                  stepError={stepError}
                  onFilesSelected={handleFilesSelected}
                  onRemove={handleRemoveFile}
                />
              )}

              {step === 3 && (
                <ReviewStep
                  taxYear={taxYear}
                  taxpayerName={taxpayerName}
                  reasons={reasons}
                  documents={documents}
                  error={submitError}
                  submitting={submitting}
                  onEditStep={handleEditStep}
                />
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              {step === 1 ? (
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 sm:w-auto"
                >
                  Cancelar
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 sm:w-auto"
                >
                  Atrás
                </button>
              )}

              {step === 3 ? (
                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 sm:w-auto"
                >
                  {submitting && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-4 animate-spin"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {submitting ? "Enviando declaración…" : "Enviar declaración"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 sm:w-auto"
                >
                  {step === 2 ? "Revisar declaración" : "Continuar"}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <p className="flex items-start justify-center gap-2 px-2 text-center text-xs leading-5 text-slate-500">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="mt-0.5 size-4 shrink-0 text-slate-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
          />
        </svg>
        <span>
          Tus documentos se usan únicamente para preparar tu declaración. No
          compartas archivos de otras personas.
        </span>
      </p>
    </div>
  );
}
