"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell, { AuthLoading } from "@/components/AppShell";
import ClientDirectory from "@/components/accountant/ClientDirectory";
import type { ClientDeclarationsState } from "@/components/accountant/ClientDeclarations";
import FirmSummary from "@/components/accountant/FirmSummary";
import {
  MAX_CLIENTS_WITH_DECLARATIONS,
  isUnauthorizedError,
} from "@/components/accountant/helpers";
import {
  assignClientAccountant,
  errorMessage,
  getMyFirm,
  listDeclarations,
  listFirmClients,
  listFirmMembers,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import type { Firm, FirmMember } from "@/lib/types";

const FIRM_PAGE_SIZE = 100;
const DECLARATIONS_PAGE_SIZE = 5;

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando información de la firma…</span>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600"
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
            d="M12 9v4m0 4h.01M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"
          />
        </svg>
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-900">
        No pudimos cargar la información de la firma
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
      >
        Reintentar
      </button>
    </section>
  );
}

function SessionExpiredState({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
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
            d="M12 8v5m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-900">
        Tu sesión expiró
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Inicia sesión nuevamente para consultar la cartera de la firma y sus
        declaraciones.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
        >
          Iniciar sesión
        </Link>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
        >
          Reintentar
        </button>
      </div>
    </section>
  );
}

export default function AccountantPage() {
  const { user, ready, authorized } = useRequireAuth({
    roles: ["accountant", "admin"],
  });

  const [firm, setFirm] = useState<Firm | null>(null);
  const [clients, setClients] = useState<FirmMember[]>([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [declarations, setDeclarations] = useState<
    Record<string, ClientDeclarationsState>
  >({});
  const [declarationsLoading, setDeclarationsLoading] = useState(false);
  const [declarationsReloadKey, setDeclarationsReloadKey] = useState(0);

  const [savingByClient, setSavingByClient] = useState<
    Record<string, boolean>
  >({});
  const [assignmentErrors, setAssignmentErrors] = useState<
    Record<string, string>
  >({});

  const userRole = user?.role ?? null;
  const isAdmin = userRole === "admin";
  const currentUserId = user?.id ?? "";
  const currentUserName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "Contador";

  const visibleClients = isAdmin
    ? clients
    : clients.filter((client) => client.accountant_id === currentUserId);
  const declarationKey = visibleClients
    .slice(0, MAX_CLIENTS_WITH_DECLARATIONS)
    .map((client) => client.id)
    .join(",");

  useEffect(() => {
    if (!ready || !authorized || !userRole) {
      return;
    }

    const admin = userRole === "admin";
    let cancelled = false;

    async function loadFirm() {
      // Microtask: evita actualizar estado de forma síncrona dentro del efecto.
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      setLoading(true);
      setError(null);
      setMembersError(null);
      setSessionExpired(false);
      setSavingByClient({});
      setAssignmentErrors({});

      const membersRequest = admin
        ? listFirmMembers({ page: 1, page_size: FIRM_PAGE_SIZE })
        : Promise.resolve(null);

      const [firmResult, clientsResult, membersResult] =
        await Promise.allSettled([
          getMyFirm(),
          listFirmClients({ page: 1, page_size: FIRM_PAGE_SIZE }),
          membersRequest,
        ]);

      if (cancelled) {
        return;
      }

      const results = [firmResult, clientsResult, membersResult];
      if (
        results.some(
          (result) =>
            result.status === "rejected" &&
            isUnauthorizedError(result.reason),
        )
      ) {
        setSessionExpired(true);
        setLoading(false);
        return;
      }

      if (firmResult.status === "rejected") {
        setError(errorMessage(firmResult.reason));
        setLoading(false);
        return;
      }

      if (clientsResult.status === "rejected") {
        setError(errorMessage(clientsResult.reason));
        setLoading(false);
        return;
      }

      setFirm(firmResult.value);
      setClients(clientsResult.value.items);
      setClientsTotal(clientsResult.value.total);

      if (admin) {
        if (membersResult.status === "fulfilled" && membersResult.value) {
          setMembers(membersResult.value.items);
          setMembersTotal(membersResult.value.total);
        } else if (membersResult.status === "rejected") {
          setMembers([]);
          setMembersTotal(0);
          setMembersError(errorMessage(membersResult.reason));
        }
      } else {
        setMembers([]);
        setMembersTotal(0);
      }

      setLoading(false);
    }

    void loadFirm();

    return () => {
      cancelled = true;
    };
  }, [authorized, ready, reloadKey, userRole]);

  useEffect(() => {
    if (!ready || !authorized || loading) {
      return;
    }

    const ids = declarationKey ? declarationKey.split(",") : [];
    let cancelled = false;

    async function loadDeclarations() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      if (ids.length === 0) {
        setDeclarations({});
        setDeclarationsLoading(false);
        return;
      }

      setDeclarationsLoading(true);

      const loadingState: Record<string, ClientDeclarationsState> = {};
      for (const clientId of ids) {
        loadingState[clientId] = { status: "loading" };
      }
      setDeclarations(loadingState);

      const results = await Promise.allSettled(
        ids.map(async (clientId) => ({
          clientId,
          page: await listDeclarations({
            page: 1,
            page_size: DECLARATIONS_PAGE_SIZE,
            taxpayer_id: clientId,
          }),
        })),
      );

      if (cancelled) {
        return;
      }

      const nextState: Record<string, ClientDeclarationsState> = {};
      let unauthorized = false;

      results.forEach((result, index) => {
        const clientId = ids[index];

        if (result.status === "fulfilled") {
          nextState[clientId] = {
            status: "ready",
            items: result.value.page.items,
            total: result.value.page.total,
          };
          return;
        }

        if (isUnauthorizedError(result.reason)) {
          unauthorized = true;
        }
        nextState[clientId] = {
          status: "error",
          message: errorMessage(result.reason),
        };
      });

      setDeclarations(nextState);
      setDeclarationsLoading(false);

      if (unauthorized) {
        setSessionExpired(true);
      }
    }

    void loadDeclarations();

    return () => {
      cancelled = true;
    };
  }, [
    authorized,
    declarationKey,
    declarationsReloadKey,
    loading,
    ready,
  ]);

  async function handleAssign(
    clientId: string,
    accountantId: string | null,
  ): Promise<void> {
    if (!isAdmin) {
      return;
    }

    const previousAccountantId =
      clients.find((client) => client.id === clientId)?.accountant_id ?? null;

    setAssignmentErrors((current) => {
      const next = { ...current };
      delete next[clientId];
      return next;
    });
    setSavingByClient((current) => ({ ...current, [clientId]: true }));
    setClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? { ...client, accountant_id: accountantId }
          : client,
      ),
    );

    try {
      const updated = await assignClientAccountant(clientId, accountantId);
      setClients((current) =>
        current.map((client) =>
          client.id === clientId ? { ...client, ...updated } : client,
        ),
      );
    } catch (cause: unknown) {
      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? { ...client, accountant_id: previousAccountantId }
            : client,
        ),
      );
      if (isUnauthorizedError(cause)) {
        setSessionExpired(true);
        return;
      }
      setAssignmentErrors((current) => ({
        ...current,
        [clientId]: errorMessage(cause),
      }));
    } finally {
      setSavingByClient((current) => {
        const next = { ...current };
        delete next[clientId];
        return next;
      });
    }
  }

  function retry(): void {
    setReloadKey((current) => current + 1);
  }

  function retryDeclarations(): void {
    setDeclarationsReloadKey((current) => current + 1);
  }

  if (!ready || !authorized) {
    return <AuthLoading />;
  }

  const firmClientTotal = firm?.client_count ?? clientsTotal;
  const clientCount = isAdmin ? firmClientTotal : visibleClients.length;
  const clientHint = isAdmin
    ? "Contribuyentes vinculados a la firma"
    : firmClientTotal > visibleClients.length
      ? `${visibleClients.length} de ${firmClientTotal} clientes de la firma`
      : "Contribuyentes asignados a tu usuario";
  const memberCount = firm?.member_count ?? membersTotal;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Gestión de firma
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Panel del contador
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                {isAdmin
                  ? `Hola, ${user?.first_name}. Administra la cartera de tu firma, asigna contadores y supervisa las declaraciones recientes.`
                  : `Hola, ${user?.first_name}. Revisa los contribuyentes asignados a tu usuario y sus declaraciones recientes.`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
                Rol: {isAdmin ? "Administrador" : "Contador"}
              </span>
              {isAdmin && (
                <Link
                  href="/accountant/invitations"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                >
                  Gestionar invitaciones
                </Link>
              )}
            </div>
          </div>
        </section>

        {sessionExpired ? (
          <SessionExpiredState onRetry={retry} />
        ) : loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <>
            <FirmSummary
              firm={firm}
              clientCount={clientCount}
              clientHint={clientHint}
              memberCount={memberCount}
              memberHint="Usuarios vinculados a la firma"
            />

            <ClientDirectory
              clients={visibleClients}
              loadedClientCount={clients.length}
              clientsTotal={clientsTotal}
              members={members}
              membersTotal={membersTotal}
              membersError={membersError}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              declarations={declarations}
              declarationsLoading={declarationsLoading}
              savingByClient={savingByClient}
              assignmentErrors={assignmentErrors}
              onAssign={handleAssign}
              onRetryDeclarations={retryDeclarations}
              onRetryMembers={retry}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
