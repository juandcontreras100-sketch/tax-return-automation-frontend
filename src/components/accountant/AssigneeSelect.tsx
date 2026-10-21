import type { FirmMember } from "@/lib/types";
import { personName } from "./helpers";

type AssigneeSelectProps = {
  id: string;
  client: FirmMember;
  accountants: FirmMember[];
  saving: boolean;
  error: string | null;
  disabled: boolean;
  hideLabel?: boolean;
  onChange: (accountantId: string | null) => void;
};

export default function AssigneeSelect({
  id,
  client,
  accountants,
  saving,
  error,
  disabled,
  hideLabel = false,
  onChange,
}: AssigneeSelectProps) {
  const clientName = personName(client);
  const assignedIsListed = accountants.some(
    (accountant) => accountant.id === client.accountant_id,
  );
  const errorId = `${id}-error`;

  return (
    <div className="w-full max-w-xs">
      <label
        htmlFor={id}
        className={
          hideLabel
            ? "sr-only"
            : "block text-xs font-semibold text-slate-600"
        }
      >
        Contador asignado para {clientName}
      </label>
      <select
        id={id}
        value={client.accountant_id ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled || saving}
        aria-busy={saving}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      >
        <option value="">Sin asignar</option>
        {accountants.map((accountant) => (
          <option key={accountant.id} value={accountant.id}>
            {personName(accountant)}
            {accountant.is_active === false ? " (inactivo)" : ""}
          </option>
        ))}
        {client.accountant_id && !assignedIsListed && (
          <option value={client.accountant_id}>
            Contador asignado (no listado)
          </option>
        )}
      </select>
      {saving && (
        <p role="status" className="mt-1 text-xs font-medium text-indigo-700">
          Guardando asignación…
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
