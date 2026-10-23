"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppShell, { AuthLoading, Brand } from "@/components/AppShell";
import { formatInvitationDate, invitationRoleLabel } from "@/components/invitations/helpers";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  ApiError,
  acceptFirmInvitation,
  errorMessage,
  previewFirmInvitation,
  rejectFirmInvitation,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { FirmInvitation } from "@/lib/types";

type ErrorCopy = {
  title: string;
  message: string;
  canRetry: boolean;
  canSignOut: boolean;
};

function invitationErrorCopy(status: number | null, message: string): ErrorCopy {
  switch (status) {
    case 404:
      return {
        title: "Invitación no disponible",
        message:
          "No encontramos esta invitación para tu cuenta. Verifica que iniciaste sesión con el correo al que fue dirigida.",
        canRetry: false,
        canSignOut: true,
      };
    case 409:
      return {
        title: "La invitación ya no está pendiente",
        message:
          "Es posible que ya la hayas aceptado, rechazado o que el administrador la haya revocado.",
        canRetry: false,
        canSignOut: false,
      };
    case 410:
      return {
        title: "La invitación expiró",
        message:
          "El enlace ya no es válido. Pide al administrador de la firma que genere una nueva invitación.",
        canRetry: false,
        canSignOut: false,
      };
    case 401:
      return {
        title: "Tu sesión expiró",
        message:
          "Vuelve a iniciar sesión para responder la invitación. Después de entrar volverás a esta pantalla.",
        canRetry: false,
        canSignOut: true,
      };
    case 422:
      return {
        title: "El enlace no es válido",
        message:
          "Revisa que hayas abierto el enlace completo que compartió el administrador de la firma.",
        canRetry: false,
        canSignOut: true,
      };
    default:
      return {
        title: "No pudimos cargar la invitación",
        message,
        canRetry: true,
        canSignOut: false,
      };
  }
}

function LoginPrompt({ loginHref }: { loginHref: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg">
        <div className="flex justify-center">
          <Brand href="/" />
        </div>
        <Card className="mt-6 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
            Invitación de firma
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Inicia sesión para responder
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para proteger la invitación, debes iniciar sesión con el correo al
            que fue dirigida. Después de entrar volverás a esta pantalla para
            revisar los detalles, aceptar o rechazar.
          </p>
          <Link
            href={loginHref}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
          >
            Iniciar sesión
          </Link>
        </Card>
      </div>
    </main>
  );
}

function InvitationLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
      <span className="sr-only">Cargando invitación…</span>
    </div>
  );
}

function InvitationRoute() {
  const params = useParams<{ token: string }>();
  return <InvitationView key={params.token} invitationToken={params.token} />;
}

function InvitationView({ invitationToken }: { invitationToken: string }) {
  const { ready, user, logout } = useAuth();
  const loginHref = `/login?next=${encodeURIComponent(
    `/invitations/${invitationToken}`,
  )}`;

  const [invitation, setInvitation] = useState<FirmInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [confirmed, setConfirmed] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [action, setAction] = useState<"accept" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (!ready || !user) {
      return;
    }

    let cancelled = false;

    async function loadInvitation() {
      // Microtask: evita actualizar estado de forma síncrona dentro del efecto.
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      setLoading(true);
      setError(null);
      setErrorStatus(null);

      try {
        const result = await previewFirmInvitation(invitationToken);
        if (!cancelled) {
          setInvitation(result);
        }
      } catch (cause: unknown) {
        if (cancelled) {
          return;
        }
        setInvitation(null);
        setErrorStatus(cause instanceof ApiError ? cause.status : null);
        setError(errorMessage(cause));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [invitationToken, ready, reloadKey, user]);

  async function handleSignOut() {
    await logout(loginHref);
  }

  async function handleAccept() {
    if (!invitation || !confirmed || action) {
      return;
    }

    setAction("accept");
    setActionError(null);

    try {
      const result = await acceptFirmInvitation(invitationToken);
      setInvitation(result);
      setAccepted(true);
    } catch (cause: unknown) {
      setActionError(errorMessage(cause));
      if (
        cause instanceof ApiError &&
        (cause.status === 404 || cause.status === 409 || cause.status === 410)
      ) {
        setReloadKey((current) => current + 1);
      }
    } finally {
      setAction(null);
    }
  }

  async function handleReject() {
    if (!invitation || action) {
      return;
    }

    setAction("reject");
    setActionError(null);

    try {
      const result = await rejectFirmInvitation(invitationToken);
      setInvitation(result);
      setRejected(true);
    } catch (cause: unknown) {
      setActionError(errorMessage(cause));
      if (
        cause instanceof ApiError &&
        (cause.status === 404 || cause.status === 409 || cause.status === 410)
      ) {
        setReloadKey((current) => current + 1);
      }
    } finally {
      setAction(null);
    }
  }

  if (!ready) {
    return <AuthLoading />;
  }

  if (!user) {
    return <LoginPrompt loginHref={loginHref} />;
  }

  if (loading && !invitation) {
    return (
      <AppShell>
        <InvitationLoading />
      </AppShell>
    );
  }

  if (!invitation) {
    const copy = invitationErrorCopy(errorStatus, error ?? "");
    return (
      <AppShell>
        <section
          role="alert"
          className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8"
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
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {copy.message}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Sesión actual: {user.email}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {copy.canRetry && (
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
              >
                Reintentar
              </button>
            )}
            {copy.canSignOut && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
              >
                Cerrar sesión y usar otra cuenta
              </button>
            )}
            {!copy.canRetry && !copy.canSignOut && (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
              >
                Volver al dashboard
              </Link>
            )}
          </div>
        </section>
      </AppShell>
    );
  }

  const target = invitation.role === "taxpayer" ? "/dashboard" : "/accountant";
  const hasFirm = Boolean(user.firm_id);

  if (accepted) {
    return (
      <AppShell>
        <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="bg-emerald-50 px-6 py-8 text-center sm:px-8">
            <span
              aria-hidden="true"
              className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 12 4 4L19 6"
                />
              </svg>
            </span>
            <h1 className="mt-4 text-xl font-bold text-emerald-950">
              Ahora haces parte de {invitation.firm_name}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-emerald-900">
              La invitación fue aceptada y tu rol en la firma ahora es{" "}
              {invitationRoleLabel(invitation.role).toLowerCase()}.
            </p>
          </div>
          <div className="px-6 py-5 text-center sm:px-8">
            <a
              href={target}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
            >
              Continuar al panel
            </a>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              El panel se recargará para actualizar tu rol y tu firma.
            </p>
          </div>
        </section>
      </AppShell>
    );
  }

  if (rejected) {
    return (
      <AppShell>
        <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-8 text-center sm:px-8">
            <span
              aria-hidden="true"
              className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"
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
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Invitación rechazada
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              No se hicieron cambios en tu cuenta. Si fue un error, pide al
              administrador de {invitation.firm_name} que envíe una nueva
              invitación.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
            >
              Volver al dashboard
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 px-6 py-7 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Invitación de firma
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {invitation.firm_name}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
              Te invita a unirte como{" "}
              {invitationRoleLabel(invitation.role).toLowerCase()}. Revisa los
              detalles antes de responder.
            </p>
          </div>

          <div className="space-y-6 px-6 py-6 sm:px-8">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Correo invitado
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                  {invitation.email}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rol en la firma
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {invitationRoleLabel(invitation.role)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invitación enviada
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {formatInvitationDate(invitation.created_at)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vence
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {formatInvitationDate(invitation.expires_at)}
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-4">
              <p className="text-sm leading-6 text-indigo-950">
                Iniciaste sesión como <strong>{user.email}</strong>. La
                vinculación solo se completa si aceptas explícitamente; rechazar
                no modifica tu cuenta.
              </p>
            </div>

            {hasFirm && (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900"
              >
                Tu cuenta ya pertenece a una firma. Para aceptar esta invitación
                primero tendrías que salir de la firma actual; el sistema no
                permite transferencias automáticas. Aún puedes rechazarla.
              </div>
            )}

            <div className="rounded-xl border border-slate-200 px-4 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Responder invitación
              </h2>
              <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={hasFirm || action !== null}
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span>
                  Confirmo que quiero unirme a{" "}
                  <strong>{invitation.firm_name}</strong> como{" "}
                  {invitationRoleLabel(invitation.role).toLowerCase()}.
                </span>
              </label>

              {actionError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {actionError}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  onClick={handleAccept}
                  disabled={!confirmed || hasFirm || action !== null}
                  aria-busy={action === "accept"}
                >
                  {action === "accept" ? "Aceptando…" : "Aceptar invitación"}
                </Button>

                {confirmReject ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-rose-700">
                      ¿Rechazar sin unirte?
                    </span>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={action !== null}
                      aria-busy={action === "reject"}
                      className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/30"
                    >
                      {action === "reject" ? "Rechazando…" : "Sí, rechazar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReject(false)}
                      disabled={action !== null}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReject(true);
                      setActionError(null);
                    }}
                    disabled={action !== null}
                    className="rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20"
                  >
                    Rechazar invitación
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function InvitationPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <InvitationRoute />
    </Suspense>
  );
}
