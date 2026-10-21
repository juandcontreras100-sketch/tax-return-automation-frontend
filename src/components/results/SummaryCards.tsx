import type { DeclarationDetail } from "@/lib/types";

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
});

type SummaryCardsProps = {
  declaration: Pick<
    DeclarationDetail,
    | "gross_income"
    | "total_tax_owed"
    | "total_withholdings"
    | "balance_to_pay"
    | "balance_in_favor"
  >;
};

function formatCop(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? copFormatter.format(amount) : "—";
}

function positiveAmount(value: string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export default function SummaryCards({ declaration }: SummaryCardsProps) {
  const toPay = positiveAmount(declaration.balance_to_pay);
  const inFavor = positiveAmount(declaration.balance_in_favor);

  const balance =
    toPay > 0
      ? {
          label: "Saldo a pagar",
          amount: formatCop(declaration.balance_to_pay),
          hint: "Valor pendiente de pago",
          className: "border-rose-200 bg-rose-50/70",
          valueClassName: "text-rose-700",
        }
      : inFavor > 0
        ? {
            label: "Saldo a favor",
            amount: formatCop(declaration.balance_in_favor),
            hint: "Valor a favor del contribuyente",
            className: "border-emerald-200 bg-emerald-50/70",
            valueClassName: "text-emerald-700",
          }
        : {
            label: "Saldo",
            amount: formatCop("0"),
            hint: "Sin saldo pendiente",
            className: "border-slate-200 bg-white",
            valueClassName: "text-slate-900",
          };

  return (
    <section aria-labelledby="summary-title">
      <h2 id="summary-title" className="sr-only">
        Resumen de la declaración
      </h2>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-sm font-medium text-slate-500">
            Ingresos brutos
          </dt>
          <dd className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
            {formatCop(declaration.gross_income)}
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Total reportado antes de deducciones
            </span>
          </dd>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-sm font-medium text-slate-500">Impuesto</dt>
          <dd className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
            {formatCop(declaration.total_tax_owed)}
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Impuesto total a cargo
            </span>
          </dd>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-sm font-medium text-slate-500">Retenciones</dt>
          <dd className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
            {formatCop(declaration.total_withholdings)}
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Valores retenidos en la fuente
            </span>
          </dd>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-sm ${balance.className}`}
        >
          <dt className="text-sm font-semibold text-slate-700">
            {balance.label}
          </dt>
          <dd
            className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${balance.valueClassName}`}
          >
            {balance.amount}
            <span className="mt-1 block text-xs font-medium text-slate-500">
              {balance.hint}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
