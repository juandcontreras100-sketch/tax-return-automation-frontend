"use client";

import Link from "next/link";
import AppShell, { AuthLoading } from "@/components/AppShell";
import InvitationManager from "@/components/accountant/InvitationManager";
import { useRequireAuth } from "@/lib/auth";

export default function AccountantInvitationsPage() {
  const { accessToken, ready, authorized } = useRequireAuth({
    roles: ["admin"],
  });

  if (!ready || !authorized || !accessToken) {
    return <AuthLoading />;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link
            href="/accountant"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline"
          >
            <span aria-hidden="true">←</span> Volver al panel del contador
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 p-6 text-white shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
            Equipo de la firma
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Invitaciones
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
            Invita a contadores o contribuyentes a tu firma. La vinculación solo
            ocurre cuando la persona inicia sesión con el correo invitado y
            acepta explícitamente. Puedes revocar cualquier invitación pendiente.
          </p>
          <span className="mt-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
            Solo administradores
          </span>
        </section>

        <InvitationManager token={accessToken} />
      </div>
    </AppShell>
  );
}
