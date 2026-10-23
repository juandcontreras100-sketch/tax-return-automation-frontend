"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import InvitationStatusBadge from "@/components/invitations/InvitationStatusBadge";
import {
  buildInvitationLink,
  formatInvitationDate,
  invitationRoleLabel,
} from "@/components/invitations/helpers";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  ApiError,
  createFirmInvitation,
  errorMessage,
  listFirmInvitations,
  revokeFirmInvitation,
} from "@/lib/api";
import type {
  FirmInvitation,
  FirmInvitationCreated,
  FirmInvitationRole,
  FirmInvitationStatus,
  Pagina,
} from "@/lib/types";

const PAGE_SIZE = 10;
type StatusFilter = "" | FirmInvitationStatus;

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "accepted", label: "Aceptadas" },
  { value: "rejected", label: "Rechazadas" },
  { value: "revoked", label: "Revocadas" },
  { value: "expired", label: "Expiradas" },
];

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
    >
      {children}
    </button>
  );
}

export default function InvitationManager() {
  const [invitations, setInvitations] = useState<Pagina<FirmInvitation> | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FirmInvitationRole>("accountant");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<FirmInvitationCreated | null>(null);
  const [savedLink, setSavedLink] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const linkInputRef = useRef<HTMLInputElement>(null);

  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(
    null,
  );
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInvitations() {
      // Microtask: evita actualizar estado de forma síncrona dentro del efecto.
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      setListLoading(true);
      setListError(null);

      try {
        const result = await listFirmInvitations({
          page,
          page_size: PAGE_SIZE,
          status: statusFilter || undefined,
        });
        if (!cancelled) {
          setInvitations(result);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setListError(errorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    void loadInvitations();

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey, statusFilter]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) {
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setCreateError("Ingresa el correo de la persona que quieres invitar.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setActionError(null);

    try {
      const result = await createFirmInvitation({
        email: normalizedEmail,
        role,
      });
      setCreated(result);
      setSavedLink(false);
      setCopyState("idle");
      setEmail("");
      setStatusFilter("");
      setPage(1);
      setReloadKey((current) => current + 1);
    } catch (cause: unknown) {
      setCreateError(errorMessage(cause));
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!created) {
      return;
    }

    const link = buildInvitationLink(created.token);
    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
    } catch {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
      setCopyState("error");
    }
  }

  function clearCreated() {
    setCreated(null);
    setSavedLink(false);
    setCopyState("idle");
  }

  async function handleRevoke(invitationId: string) {
    if (revokingId) {
      return;
    }

    setRevokingId(invitationId);
    setActionError(null);

    try {
      await revokeFirmInvitation(invitationId);
      setConfirmingRevokeId(null);
      if (created?.id === invitationId) {
        clearCreated();
      }

      if (invitations?.items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (cause: unknown) {
      setActionError(errorMessage(cause));
      if (
        cause instanceof ApiError &&
        (cause.status === 404 || cause.status === 409)
      ) {
        setConfirmingRevokeId(null);
        setReloadKey((current) => current + 1);
      }
    } finally {
      setRevokingId(null);
    }
  }

  const invitationLink = created ? buildInvitationLink(created.token) : "";
  const total = invitations?.total ?? 0;
  const totalLabel = `${total} ${
    total === 1 ? "invitación" : "invitaciones"
  }`;
  const hasFilter = Boolean(statusFilter);

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="create-invitation-title"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2
            id="create-invitation-title"
            className="text-lg font-bold text-slate-900"
          >
            {created ? "Invitación creada" : "Invitar a la firma"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {created
              ? "Comparte el enlace con la persona invitada. Por seguridad, el token no se vuelve a mostrar después de salir de esta pantalla."
              : "Envía una invitación por correo electrónico. La persona deberá iniciar sesión con ese mismo correo y aceptar explícitamente antes de vincularse a la firma."}
          </p>
        </div>

        {created ? (
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Invitación para {created.email}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Rol: {invitationRoleLabel(created.role)} · Vence el{" "}
                    {formatInvitationDate(created.expires_at)}
                  </p>
                </div>
                <InvitationStatusBadge status={created.status} />
              </div>
            </div>

            <div>
              <label
                htmlFor="created-invitation-link"
                className="block text-sm font-semibold text-slate-700"
              >
                Enlace de invitación
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  ref={linkInputRef}
                  id="created-invitation-link"
                  type="text"
                  readOnly
                  value={invitationLink}
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                  aria-describedby="created-invitation-help"
                />
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copyState === "copied" ? "Copiado" : "Copiar enlace"}
                </Button>
              </div>
              <p
                id="created-invitation-help"
                className="mt-2 text-xs leading-5 text-slate-500"
              >
                El enlace contiene un token de un solo uso. Compártelo solo con
                la persona invitada; no lo publiques ni lo reenvíes a terceros.
              </p>
              {copyState === "error" && (
                <p role="alert" className="mt-2 text-xs text-rose-700">
                  No pudimos copiar automáticamente. El enlace quedó
                  seleccionado; cópialo manualmente.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <label className="flex items-start gap-3 text-sm leading-6 text-amber-900">
                <input
                  type="checkbox"
                  checked={savedLink}
                  onChange={(event) => setSavedLink(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Confirmo que guardé este enlace. Si creo otra invitación, este
                  enlace dejará de mostrarse y no podré recuperarlo.
                </span>
              </label>
              <Button
                type="button"
                onClick={clearCreated}
                disabled={!savedLink}
                className="mt-3"
              >
                Crear otra invitación
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4 px-5 py-5 sm:px-6"
            onSubmit={handleCreate}
            noValidate
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
              <div>
                <label
                  htmlFor="invitation-email"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Correo electrónico
                </label>
                <Input
                  id="invitation-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  aria-required="true"
                  aria-describedby="invitation-email-help"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="persona@correo.com"
                  className="mt-2"
                />
                <p
                  id="invitation-email-help"
                  className="mt-1 text-xs leading-5 text-slate-500"
                >
                  Debe coincidir con el correo de una cuenta registrada.
                </p>
              </div>

              <div>
                <label
                  htmlFor="invitation-role"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Rol en la firma
                </label>
                <select
                  id="invitation-role"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as FirmInvitationRole)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                >
                  <option value="accountant">Contador</option>
                  <option value="taxpayer">Contribuyente</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={creating}
                aria-busy={creating}
                className="md:mb-0"
              >
                {creating ? "Creando…" : "Crear invitación"}
              </Button>
            </div>

            {createError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {createError}
              </div>
            )}
          </form>
        )}
      </section>

      <section
        aria-labelledby="invitations-list-title"
        aria-busy={listLoading}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="invitations-list-title"
              className="text-lg font-bold text-slate-900"
            >
              Invitaciones de la firma
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {invitations ? totalLabel : "Consulta las invitaciones enviadas."}
            </p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
              El enlace con el token solo se muestra al crear la invitación; no
              se puede recuperar desde este listado.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="invitation-status-filter"
              className="text-xs font-semibold text-slate-600"
            >
              Estado
            </label>
            <select
              id="invitation-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
                setConfirmingRevokeId(null);
                setActionError(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 md:w-48"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {actionError && (
          <div
            role="alert"
            className="flex flex-col gap-3 border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <p>{actionError}</p>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="self-start rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 sm:self-auto"
            >
              Cerrar
            </button>
          </div>
        )}

        {listError && (
          <div
            role="alert"
            className="flex flex-col gap-3 border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <p>{listError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="self-start rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 sm:self-auto"
            >
              Reintentar
            </button>
          </div>
        )}

        {listLoading && invitations && (
          <p
            role="status"
            className="border-b border-indigo-100 bg-indigo-50/70 px-5 py-2 text-xs font-medium text-indigo-700 sm:px-6"
          >
            Actualizando invitaciones…
          </p>
        )}

        {listLoading && !invitations && (
          <div
            className="space-y-3 p-5 sm:p-6"
            role="status"
            aria-label="Cargando invitaciones"
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-12 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
            <span className="sr-only">Cargando invitaciones…</span>
          </div>
        )}

        {!listLoading &&
          !listError &&
          invitations &&
          invitations.items.length === 0 && (
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
                    d="M4 6h16v12H4V6Zm0 0 8 7 8-7"
                  />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                {hasFilter
                  ? "No hay invitaciones con este estado"
                  : "Aún no has invitado a nadie"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                {hasFilter
                  ? "Prueba con otro estado para encontrar la invitación."
                  : "Crea la primera invitación para incorporar contadores o contribuyentes a tu firma."}
              </p>
              {hasFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("");
                    setPage(1);
                  }}
                  className="mt-5 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
          )}

        {invitations && invitations.items.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Correo</th>
                    <th className="px-4 py-3 font-semibold">Rol</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Creada</th>
                    <th className="px-4 py-3 font-semibold">Expira</th>
                    <th className="px-6 py-3 text-right font-semibold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.items.map((invitation) => (
                    <tr
                      key={invitation.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="max-w-56 truncate px-6 py-4 font-medium text-slate-900">
                        {invitation.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {invitationRoleLabel(invitation.role)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <InvitationStatusBadge status={invitation.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                        {formatInvitationDate(invitation.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                        {formatInvitationDate(invitation.expires_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {invitation.status === "pending" ? (
                          confirmingRevokeId === invitation.id ? (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <span className="text-xs font-semibold text-rose-700">
                                ¿Revocar?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRevoke(invitation.id)}
                                disabled={revokingId !== null}
                                aria-busy={revokingId === invitation.id}
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30"
                              >
                                {revokingId === invitation.id
                                  ? "Revocando…"
                                  : "Sí, revocar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingRevokeId(null)}
                                disabled={revokingId !== null}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingRevokeId(invitation.id);
                                setActionError(null);
                              }}
                              disabled={revokingId !== null}
                              className="font-semibold text-rose-600 underline-offset-4 hover:text-rose-700 hover:underline disabled:cursor-not-allowed disabled:text-rose-300"
                            >
                              Revocar
                            </button>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {invitations.items.map((invitation) => (
                <li key={invitation.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-slate-900">
                        {invitation.email}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {invitationRoleLabel(invitation.role)}
                      </p>
                    </div>
                    <InvitationStatusBadge status={invitation.status} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">
                        Creada
                      </dt>
                      <dd className="mt-0.5 text-xs text-slate-700">
                        {formatInvitationDate(invitation.created_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">
                        Expira
                      </dt>
                      <dd className="mt-0.5 text-xs text-slate-700">
                        {formatInvitationDate(invitation.expires_at)}
                      </dd>
                    </div>
                  </dl>

                  {invitation.status === "pending" && (
                    <div className="mt-3">
                      {confirmingRevokeId === invitation.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-rose-700">
                            ¿Revocar invitación?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevoke(invitation.id)}
                            disabled={revokingId !== null}
                            aria-busy={revokingId === invitation.id}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30"
                          >
                            {revokingId === invitation.id
                              ? "Revocando…"
                              : "Sí, revocar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingRevokeId(null)}
                            disabled={revokingId !== null}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingRevokeId(invitation.id);
                            setActionError(null);
                          }}
                          disabled={revokingId !== null}
                          className="text-sm font-semibold text-rose-600 underline-offset-4 hover:text-rose-700 hover:underline disabled:cursor-not-allowed disabled:text-rose-300"
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {invitations.total_pages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  Página {invitations.page} de {invitations.total_pages} ·{" "}
                  {totalLabel}
                </p>
                <div className="flex gap-2">
                  <PageButton
                    disabled={invitations.page <= 1 || listLoading}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Anterior
                  </PageButton>
                  <PageButton
                    disabled={
                      invitations.page >= invitations.total_pages || listLoading
                    }
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente
                  </PageButton>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
