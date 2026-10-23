import type { FirmInvitationStatus } from "@/lib/types";
import { invitationStatusLabel } from "./helpers";

const statusStyles: Record<FirmInvitationStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  revoked: "bg-slate-100 text-slate-500 ring-slate-200",
  expired: "bg-slate-100 text-slate-500 ring-slate-200",
};

export default function InvitationStatusBadge({
  status,
}: {
  status: FirmInvitationStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusStyles[status]
      }`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {invitationStatusLabel(status)}
    </span>
  );
}
