import Link from "next/link";
import type { FirmMember } from "@/lib/types";
import AssigneeSelect from "./AssigneeSelect";
import ClientDeclarations, {
  type ClientDeclarationsState,
} from "./ClientDeclarations";
import { MAX_CLIENTS_WITH_DECLARATIONS, personName } from "./helpers";

type ClientDirectoryProps = {
  clients: FirmMember[];
  loadedClientCount: number;
  clientsTotal: number;
  members: FirmMember[];
  membersTotal: number;
  membersError: string | null;
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  declarations: Record<string, ClientDeclarationsState>;
  declarationsLoading: boolean;
  savingByClient: Record<string, boolean>;
  assignmentErrors: Record<string, string>;
  onAssign: (clientId: string, accountantId: string | null) => void;
  onRetryDeclarations: () => void;
  onRetryMembers: () => void;
};

function ActiveBadge({ active }: { active: boolean | null }) {
  const label =
    active === false ? "Inactivo" : active === null ? "Sin estado" : "Activo";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        active === false
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : active === null
            ? "bg-slate-100 text-slate-600 ring-slate-200"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
      }`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {label}
    </span>
  );
}

function EmptyClients({
  isAdmin,
  clientsTotal,
}: {
  isAdmin: boolean;
  clientsTotal: number;
}) {
  return (
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
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          />
        </svg>
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-900">
        {isAdmin || clientsTotal === 0
          ? "La firma aún no tiene clientes"
          : "Aún no tienes clientes asignados"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {isAdmin
          ? "Cuando los contribuyentes se vinculen a tu firma aparecerán aquí con sus declaraciones y podrás asignarles un contador."
          : clientsTotal > 0
            ? `Tu firma tiene ${clientsTotal} ${
                clientsTotal === 1 ? "cliente" : "clientes"
              }, pero ninguno está asignado a tu usuario. Un administrador de la firma puede hacer la asignación.`
            : "La firma aún no tiene contribuyentes vinculados. Cuando se registren, un administrador podrá asignártelos."}
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}

export default function ClientDirectory({
  clients,
  loadedClientCount,
  clientsTotal,
  members,
  membersTotal,
  membersError,
  isAdmin,
  currentUserId,
  currentUserName,
  declarations,
  declarationsLoading,
  savingByClient,
  assignmentErrors,
  onAssign,
  onRetryDeclarations,
  onRetryMembers,
}: ClientDirectoryProps) {
  const accountants = members
    .filter((member) => member.role === "accountant")
    .sort((left, right) =>
      personName(left).localeCompare(personName(right), "es"),
    );

  function assignedAccountantName(client: FirmMember): string {
    if (!client.accountant_id) {
      return "Sin asignar";
    }

    const member = members.find(
      (candidate) => candidate.id === client.accountant_id,
    );
    if (member) {
      return personName(member);
    }
    if (client.accountant_id === currentUserId) {
      return currentUserName;
    }
    return "Contador no listado";
  }

  function declarationsFor(
    client: FirmMember,
    index: number,
  ): ClientDeclarationsState | undefined {
    if (index >= MAX_CLIENTS_WITH_DECLARATIONS) {
      return { status: "deferred" };
    }
    return declarations[client.id];
  }

  const assignmentDisabled = membersError !== null || accountants.length === 0;

  return (
    <section
      aria-labelledby="clients-title"
      aria-busy={declarationsLoading}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="space-y-3 border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="clients-title" className="text-lg font-bold text-slate-900">
              Clientes y declaraciones
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {isAdmin
                ? "Asigna un contador a cada contribuyente y revisa sus declaraciones más recientes."
                : "Estos son los contribuyentes asignados a tu usuario y sus declaraciones más recientes."}
            </p>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {clients.length}{" "}
            {clients.length === 1 ? "cliente visible" : "clientes visibles"}
          </p>
        </div>

        {membersError && isAdmin && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>No se pudieron cargar los contadores: {membersError}</p>
            <button
              type="button"
              onClick={onRetryMembers}
              className="self-start rounded-md border border-rose-300 bg-white px-2 py-1 font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 sm:self-auto"
            >
              Reintentar
            </button>
          </div>
        )}

        {isAdmin && !membersError && accountants.length === 0 && (
          <p className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-5 text-indigo-800">
            La firma todavía no tiene contadores. Invita a un contador para poder
            asignarle clientes.
          </p>
        )}

        {loadedClientCount < clientsTotal && (
          <p className="text-xs leading-5 text-slate-500">
            Se cargaron los primeros {loadedClientCount} de {clientsTotal}{" "}
            clientes de la firma.
          </p>
        )}

        {clients.length > MAX_CLIENTS_WITH_DECLARATIONS && (
          <p className="text-xs leading-5 text-slate-500">
            Para mantener la vista ágil, las declaraciones se cargan solo para
            los primeros {MAX_CLIENTS_WITH_DECLARATIONS} clientes. Los demás se
            muestran sin declaraciones en esta vista.
          </p>
        )}

        {isAdmin && membersTotal > members.length && (
          <p className="text-xs leading-5 text-slate-500">
            El selector de contador lista {members.length} de {membersTotal}{" "}
            miembros de la firma.
          </p>
        )}
      </div>

      {clients.length === 0 ? (
        <EmptyClients isAdmin={isAdmin} clientsTotal={clientsTotal} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">
                Clientes de la firma con su estado, contador asignado y
                declaraciones recientes
              </caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Contador asignado
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Declaraciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="align-top transition hover:bg-slate-50/60"
                  >
                    <th
                      scope="row"
                      className="px-5 py-4 text-left align-top font-normal"
                    >
                      <p className="font-semibold text-slate-900">
                        {personName(client)}
                      </p>
                      <p className="mt-0.5 break-all text-xs text-slate-500">
                        {client.email}
                      </p>
                    </th>
                    <td className="px-4 py-4">
                      <ActiveBadge active={client.is_active} />
                    </td>
                    <td className="px-4 py-4">
                      {isAdmin ? (
                        <AssigneeSelect
                          id={`assignee-desktop-${client.id}`}
                          client={client}
                          accountants={accountants}
                          saving={Boolean(savingByClient[client.id])}
                          error={assignmentErrors[client.id] ?? null}
                          disabled={assignmentDisabled}
                          hideLabel
                          onChange={(accountantId) =>
                            onAssign(client.id, accountantId)
                          }
                        />
                      ) : (
                        <p className="text-sm font-medium text-slate-700">
                          {assignedAccountantName(client)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <ClientDeclarations
                        clientName={personName(client)}
                        state={declarationsFor(client, index)}
                        onRetry={onRetryDeclarations}
                        emptyMessage={
                          isAdmin
                            ? "El administrador no ve declaraciones automáticamente; asigna un contador para revisarlas."
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {clients.map((client, index) => (
              <li key={client.id} className="space-y-4 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {personName(client)}
                    </p>
                    <p className="mt-0.5 break-all text-xs text-slate-500">
                      {client.email}
                    </p>
                  </div>
                  <ActiveBadge active={client.is_active} />
                </div>

                <div>
                  {isAdmin ? (
                    <AssigneeSelect
                      id={`assignee-mobile-${client.id}`}
                      client={client}
                      accountants={accountants}
                      saving={Boolean(savingByClient[client.id])}
                      error={assignmentErrors[client.id] ?? null}
                      disabled={assignmentDisabled}
                      onChange={(accountantId) =>
                        onAssign(client.id, accountantId)
                      }
                    />
                  ) : (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Contador asignado
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {assignedAccountantName(client)}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Declaraciones
                  </p>
                  <ClientDeclarations
                    clientName={personName(client)}
                    state={declarationsFor(client, index)}
                    onRetry={onRetryDeclarations}
                    emptyMessage={
                      isAdmin
                        ? "El administrador no ve declaraciones automáticamente; asigna un contador para revisarlas."
                        : undefined
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
