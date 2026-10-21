import { ApiError } from "@/lib/api";
import type { DeclarationListItem, FirmMember } from "@/lib/types";

/** Límite de clientes para los que se cargan declaraciones en la vista. */
export const MAX_CLIENTS_WITH_DECLARATIONS = 30;

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
});

export function formatCop(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  return copFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export type BalanceInfo = {
  label: string;
  value: string;
  className: string;
};

export function balanceInfo(item: DeclarationListItem): BalanceInfo {
  const toPay = Number(item.balance_to_pay ?? 0);
  const inFavor = Number(item.balance_in_favor ?? 0);

  if (Number.isFinite(toPay) && toPay > 0) {
    return {
      label: "A pagar",
      value: formatCop(toPay),
      className: "text-rose-700",
    };
  }
  if (Number.isFinite(inFavor) && inFavor > 0) {
    return {
      label: "A favor",
      value: formatCop(inFavor),
      className: "text-emerald-700",
    };
  }
  return {
    label: "Sin saldo",
    value: formatCop(0),
    className: "text-slate-500",
  };
}

export function personName(
  person: Pick<FirmMember, "first_name" | "last_name"> | null | undefined,
): string {
  const name = [person?.first_name, person?.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();

  return name || "Sin nombre";
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
