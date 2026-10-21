"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppShell, { AuthLoading } from "@/components/AppShell";
import CorrectionsPanel from "@/components/results/CorrectionsPanel";
import FormValuesTable from "@/components/results/FormValuesTable";
import ProcessingNotice from "@/components/results/ProcessingNotice";
import ResultsHeader from "@/components/results/ResultsHeader";
import ReviewNotice from "@/components/results/ReviewNotice";
import SummaryCards from "@/components/results/SummaryCards";
import {
  ResultsLoadError,
  ResultsLoading,
  ResultsNotFound,
} from "@/components/results/ResultsFeedback";
import {
  ApiError,
  downloadDeclarationPdf,
  errorMessage,
  getDeclaration,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { downloadBlob, safePdfFilename } from "@/lib/pdf";
import type { DeclarationDetail } from "@/lib/types";

async function hasPdfSignature(blob: Blob): Promise<boolean> {
  if (blob.size < 4) {
    return false;
  }

  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  return (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46
  );
}

function DeclarationResultRoute() {
  const params = useParams<{ id: string }>();

  return <DeclarationResult key={params.id} id={params.id} />;
}

function DeclarationResult({ id }: { id: string }) {
  const { accessToken, authorized, ready, user } = useRequireAuth();
  const [declaration, setDeclaration] = useState<DeclarationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !authorized || !accessToken) {
      return;
    }

    let cancelled = false;
    const token = accessToken;

    async function loadDeclaration() {
      // Microtask: evita actualizar estado de forma síncrona dentro del efecto.
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getDeclaration(token, id);
        if (cancelled) {
          return;
        }
        setDeclaration(result);
        setNotFound(false);
      } catch (cause: unknown) {
        if (cancelled) {
          return;
        }

        if (cause instanceof ApiError && cause.status === 404) {
          setDeclaration(null);
          setNotFound(true);
          setError(null);
        } else {
          setError(errorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDeclaration();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authorized, id, ready, reloadKey]);

  function reloadDeclaration() {
    setError(null);
    setDownloadError(null);
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  async function handleDownload() {
    if (!accessToken || !declaration || downloading) {
      return;
    }

    setDownloading(true);
    setDownloadError(null);

    try {
      const blob = await downloadDeclarationPdf(accessToken, declaration.id);
      if (!(await hasPdfSignature(blob))) {
        throw new Error(
          "El archivo recibido no es un PDF válido. Inténtalo de nuevo.",
        );
      }

      downloadBlob(blob, safePdfFilename(declaration.tax_year, declaration.id));
    } catch (cause: unknown) {
      setDownloadError(errorMessage(cause));
    } finally {
      setDownloading(false);
    }
  }

  if (!ready || !authorized) {
    return <AuthLoading />;
  }

  if (!declaration && loading) {
    return (
      <AppShell>
        <ResultsLoading />
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell>
        <ResultsNotFound />
      </AppShell>
    );
  }

  if (!declaration) {
    return (
      <AppShell>
        <ResultsLoadError
          message={error ?? "No pudimos cargar la declaración."}
          onRetry={reloadDeclaration}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <ResultsHeader
          declaration={declaration}
          refreshing={loading}
          downloading={downloading}
          onRefresh={reloadDeclaration}
          onDownload={handleDownload}
        />

        {downloadError && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="font-semibold">No se pudo descargar el PDF.</p>
              <p className="mt-0.5 leading-6">{downloadError}</p>
            </div>
            <button
              type="button"
              onClick={() => setDownloadError(null)}
              className="self-start rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20"
            >
              Cerrar
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="font-semibold">
                No se pudo actualizar la declaración.
              </p>
              <p className="mt-0.5 leading-6">{error}</p>
            </div>
            <button
              type="button"
              onClick={reloadDeclaration}
              className="self-start rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20"
            >
              Reintentar
            </button>
          </div>
        )}

        {declaration.status === "processing" && (
          <ProcessingNotice declarationId={declaration.id} />
        )}

        <ReviewNotice
          status={declaration.status}
          observations={declaration.observations}
        />

        <SummaryCards
          declaration={{
            ...declaration,
            gross_income:
              declaration.form_values.find(
                (value) => value.field_code === "ING_TRABAJO",
              )?.value_numeric ?? declaration.gross_income,
            total_tax_owed:
              declaration.form_values.find(
                (value) => value.field_code === "IMPUESTO_RENTA",
              )?.value_numeric ?? declaration.total_tax_owed,
            total_withholdings:
              declaration.form_values.find(
                (value) => value.field_code === "RETENCIONES",
              )?.value_numeric ?? declaration.total_withholdings,
            balance_to_pay:
              declaration.form_values.find(
                (value) => value.field_code === "SALDO_A_PAGAR",
              )?.value_numeric ?? declaration.balance_to_pay,
            balance_in_favor:
              declaration.form_values.find(
                (value) => value.field_code === "SALDO_A_FAVOR",
              )?.value_numeric ?? declaration.balance_in_favor,
          }}
        />

        <FormValuesTable values={declaration.form_values} />

        {accessToken &&
          user &&
          (user.role === "accountant" || user.role === "admin") && (
            <CorrectionsPanel
              token={accessToken}
              declarationId={declaration.id}
              values={declaration.form_values}
              onSaved={reloadDeclaration}
            />
          )}
      </div>
    </AppShell>
  );
}

export default function DeclarationResultPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <DeclarationResultRoute />
    </Suspense>
  );
}
