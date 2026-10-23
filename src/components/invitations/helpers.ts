import type { FirmInvitationRole, FirmInvitationStatus } from "@/lib/types";

export const invitationRoleLabels: Record<FirmInvitationRole, string> = {
  accountant: "Contador",
  taxpayer: "Contribuyente",
};

export const invitationStatusLabels: Record<FirmInvitationStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  revoked: "Revocada",
  expired: "Expirada",
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export function formatInvitationDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return dateTimeFormatter.format(date);
}

export function invitationRoleLabel(role: string): string {
  return (
    invitationRoleLabels[role as FirmInvitationRole] ??
    role.replaceAll("_", " ")
  );
}

export function invitationStatusLabel(status: string): string {
  return (
    invitationStatusLabels[status as FirmInvitationStatus] ??
    status.replaceAll("_", " ")
  );
}

/**
 * Construye el enlace que el administrador comparte con la persona invitada.
 * El token solo existe en la respuesta de creación; no se puede recuperar
 * desde el listado.
 */
export function buildInvitationLink(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/invitations/${encodeURIComponent(token)}`;
}
