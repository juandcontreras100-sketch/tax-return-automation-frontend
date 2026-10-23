"use client";

import { useEffect, useState } from "react";
import {
  formatInvitationDate,
  invitationRoleLabel,
} from "@/components/invitations/helpers";
import { listMyInvitations } from "@/lib/api";
import type { FirmInvitation } from "@/lib/types";

/**
 * Aviso informativo para el titular de una invitación. El token no forma parte
 * del listado por seguridad, así que la acción se realiza desde el enlace que
 * el administrador compartió.
 */
export default function PendingInvitations({ token }: { token: string }) {
  const [items, setItems] = useState<FirmInvitation[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const authToken = token;

    async function loadInvitations() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      try {
        const result = await listMyInvitations(authToken, {
          page: 1,
          page_size: 5,
        });
        if (!cancelled) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch {
        // Es un aviso secundario: un fallo no debe bloquear el dashboard.
      }
    }

    void loadInvitations();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="pending-invitations-title"
      className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 shadow-sm sm:px-6"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
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
              d="M4 6h16v12H4V6Zm0 0 8 7 8-7"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <h2
            id="pending-invitations-title"
            className="text-base font-bold text-amber-950"
          >
            {total === 1
              ? "Tienes una invitación pendiente"
              : `Tienes ${total} invitaciones pendientes`}
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Abre el enlace que recibiste del administrador de la firma para
            revisar los detalles, aceptar o rechazar. Por seguridad, el enlace
            no se muestra en esta página.
          </p>

          <ul className="mt-4 space-y-2">
            {items.map((invitation) => (
              <li
                key={invitation.id}
                className="rounded-xl border border-amber-200 bg-white/70 px-4 py-3"
              >
                <p className="text-sm font-semibold text-amber-950">
                  {invitation.firm_name}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-amber-900">
                  Rol: {invitationRoleLabel(invitation.role)} · Vence el{" "}
                  {formatInvitationDate(invitation.expires_at)}
                </p>
              </li>
            ))}
          </ul>

          {total > items.length && (
            <p className="mt-2 text-xs text-amber-900">
              Hay {total - items.length} invitación(es) adicional(es). Revisa los
              enlaces que recibiste.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
