import {
  ApiError,
  type CorrectionResponse,
  type CreateDeclarationResult,
  type DeclarationDetail,
  type DeclarationListItem,
  type DeclarationListParams,
  type DianCapabilities,
  type Firm,
  type FirmInvitation,
  type FirmInvitationCreated,
  type FirmInvitationListParams,
  type FirmInvitationRole,
  type FirmMember,
  type JobTicket,
  type Pagina,
  type RegisterPayload,
  type User,
} from "./types";

export { ApiError } from "./types";

/**
 * El navegador solo habla con el BFF de Next.js. Las cookies de sesión son
 * httpOnly; el access token y el refresh token nunca llegan al cliente.
 */
export const API_URL = "/api";

type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(
  handler: SessionExpiredHandler | null,
): void {
  sessionExpiredHandler = handler;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
  body?: BodyInit | null;
  headers?: HeadersInit;
  handleUnauthorized?: boolean;
};

type ValidationItem = {
  loc?: unknown;
  msg?: unknown;
  message?: unknown;
  type?: unknown;
};

const fieldLabels: Record<string, string> = {
  email: "Correo",
  password: "Contraseña",
  first_name: "Nombre",
  last_name: "Apellido",
  document_type: "Tipo de documento",
  document_number: "Número de documento",
  phone: "Teléfono",
  refresh_token: "Token de sesión",
  corrected_value: "Valor corregido",
  tax_year: "Año gravable",
  taxpayer_id: "Contribuyente",
};

function formatValidationItem(item: unknown): string {
  if (typeof item === "string") {
    return item;
  }
  if (!item || typeof item !== "object") {
    return String(item);
  }

  const record = item as ValidationItem;
  const rawMessage =
    typeof record.msg === "string"
      ? record.msg
      : typeof record.message === "string"
        ? record.message
        : null;

  if (!rawMessage) {
    try {
      return JSON.stringify(item) ?? "Dato inválido.";
    } catch {
      return "Dato inválido.";
    }
  }

  const message = rawMessage.replace(/^Value error,\s*/i, "");
  const location = Array.isArray(record.loc)
    ? record.loc
        .filter((part) => part !== "body" && part !== "query" && part !== "path")
        .map(String)
        .join(".")
    : "";
  const label = location ? fieldLabels[location] ?? location : "";

  return label ? `${label}: ${message}` : message;
}

function messagesFromArray(items: unknown[]): string {
  return items
    .map(formatValidationItem)
    .filter((message) => message.trim().length > 0)
    .join(" ");
}

export function extractApiDetail(
  payload: unknown,
  fallback = "Ocurrió un error inesperado.",
): string {
  if (typeof payload === "string") {
    return payload.trim() || fallback;
  }

  if (Array.isArray(payload)) {
    return messagesFromArray(payload) || fallback;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const detail = record.detail;

    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return messagesFromArray(detail) || fallback;
    }
    if (detail && typeof detail === "object") {
      const nested = detail as Record<string, unknown>;
      if (typeof nested.message === "string") {
        const errors = Array.isArray(nested.errors)
          ? messagesFromArray(nested.errors)
          : "";
        return errors ? `${nested.message} ${errors}` : nested.message;
      }
      if (typeof nested.detail === "string") {
        return nested.detail;
      }
    }
    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return fallback;
}

async function toApiError(response: Response): Promise<ApiError> {
  const text = await response.text().catch(() => "");
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  const detail = extractApiDetail(
    payload,
    response.statusText || `Error ${response.status}`,
  );
  return new ApiError(response.status, detail, payload);
}

function readCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  for (const part of document.cookie.split(";")) {
    const entry = part.trim();
    if (entry.startsWith("taxfrom_csrf=")) {
      return decodeURIComponent(entry.slice("taxfrom_csrf=".length));
    }
  }
  return null;
}

function buildFetchInit(options: RequestOptions): RequestInit {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (method !== "GET") {
    const csrf = readCsrfToken();
    if (csrf) {
      headers.set("X-CSRF-Token", csrf);
    }
  }

  return {
    method,
    headers,
    body:
      options.json !== undefined
        ? JSON.stringify(options.json)
        : options.body,
    cache: "no-store",
    credentials: "same-origin",
  };
}

async function performFetch(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  return fetch(`${API_URL}${path}`, buildFetchInit(options));
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await performFetch(path, options);

  if (response.status === 401 && options.handleUnauthorized !== false) {
    sessionExpiredHandler?.();
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.detail;
  }
  if (error instanceof TypeError) {
    return "No pudimos conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado.";
}

export async function login(
  email: string,
  password: string,
): Promise<User> {
  return request<User>("/v1/auth/login", {
    method: "POST",
    json: { email, password },
    handleUnauthorized: false,
  });
}

export async function register(payload: RegisterPayload): Promise<User> {
  return request<User>("/v1/auth/register", {
    method: "POST",
    json: payload,
    handleUnauthorized: false,
  });
}

export async function me(): Promise<User> {
  return request<User>("/v1/auth/me");
}

export async function logout(): Promise<void> {
  return request<void>("/v1/auth/logout", {
    method: "POST",
    handleUnauthorized: false,
  });
}

export async function listDeclarations(
  params: DeclarationListParams = {},
): Promise<Pagina<DeclarationListItem>> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.page_size ?? 20));

  if (params.status) {
    search.set("status", params.status);
  }
  if (params.tax_year) {
    search.set("tax_year", String(params.tax_year));
  }
  if (params.taxpayer_id) {
    search.set("taxpayer_id", params.taxpayer_id);
  }

  return request<Pagina<DeclarationListItem>>(
    `/v1/declarations?${search.toString()}`,
  );
}

export async function getDeclaration(
  id: string,
): Promise<DeclarationDetail> {
  return request<DeclarationDetail>(
    `/v1/declarations/${encodeURIComponent(id)}`,
  );
}

export async function downloadDeclarationPdf(id: string): Promise<Blob> {
  const path = `/v1/declarations/${encodeURIComponent(id)}/pdf`;
  const response = await performFetch(path, {
    headers: { Accept: "application/pdf" },
  });

  if (response.status === 401) {
    sessionExpiredHandler?.();
  }
  if (!response.ok) {
    throw await toApiError(response);
  }

  return response.blob();
}

export async function createDeclaration(
  formData: FormData,
): Promise<CreateDeclarationResult> {
  return request<CreateDeclarationResult>("/v1/declarations", {
    method: "POST",
    body: formData,
  });
}

export async function updateDeclarationValue(
  declarationId: string,
  fieldCode: string,
  correctedValue: string,
  documentId?: string,
): Promise<CorrectionResponse> {
  const payload: { corrected_value: string; document_id?: string } = {
    corrected_value: correctedValue,
  };
  if (documentId) {
    payload.document_id = documentId;
  }

  return request<CorrectionResponse>(
    `/v1/declarations/${encodeURIComponent(declarationId)}/values/${encodeURIComponent(fieldCode)}`,
    {
      method: "PATCH",
      json: payload,
    },
  );
}

export async function getDianCapabilities(): Promise<DianCapabilities> {
  return request<DianCapabilities>("/v1/dian/capabilities");
}

export async function getMyFirm(): Promise<Firm> {
  return request<Firm>("/v1/firms/me");
}

export async function listFirmMembers(
  params: { page?: number; page_size?: number } = {},
): Promise<Pagina<FirmMember>> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.page_size ?? 100),
  });
  return request<Pagina<FirmMember>>(
    `/v1/firms/me/members?${search.toString()}`,
  );
}

export async function listFirmClients(
  params: { page?: number; page_size?: number } = {},
): Promise<Pagina<FirmMember>> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.page_size ?? 100),
  });
  return request<Pagina<FirmMember>>(
    `/v1/firms/me/clients?${search.toString()}`,
  );
}

export async function assignClientAccountant(
  clientId: string,
  accountantId: string | null,
): Promise<FirmMember> {
  return request<FirmMember>(
    `/v1/firms/me/clients/${encodeURIComponent(clientId)}/accountant`,
    {
      method: "PATCH",
      json: { accountant_id: accountantId },
    },
  );
}

function buildInvitationSearch(params: FirmInvitationListParams): string {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.page_size ?? 20),
  });
  if (params.status) {
    search.set("status", params.status);
  }
  return search.toString();
}

export async function createFirmInvitation(payload: {
  email: string;
  role: FirmInvitationRole;
}): Promise<FirmInvitationCreated> {
  return request<FirmInvitationCreated>("/v1/firms/me/invitations", {
    method: "POST",
    json: payload,
  });
}

export async function listFirmInvitations(
  params: FirmInvitationListParams = {},
): Promise<Pagina<FirmInvitation>> {
  return request<Pagina<FirmInvitation>>(
    `/v1/firms/me/invitations?${buildInvitationSearch(params)}`,
  );
}

export async function revokeFirmInvitation(
  invitationId: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/me/invitations/${encodeURIComponent(invitationId)}/revoke`,
    { method: "POST" },
  );
}

export async function listMyInvitations(
  params: { page?: number; page_size?: number } = {},
): Promise<Pagina<FirmInvitation>> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.page_size ?? 20),
  });
  return request<Pagina<FirmInvitation>>(
    `/v1/firms/invitations?${search.toString()}`,
  );
}

export async function previewFirmInvitation(
  invitationToken: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/invitations/${encodeURIComponent(invitationToken)}`,
  );
}

export async function acceptFirmInvitation(
  invitationToken: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/invitations/${encodeURIComponent(invitationToken)}/accept`,
    { method: "POST" },
  );
}

export async function rejectFirmInvitation(
  invitationToken: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/invitations/${encodeURIComponent(invitationToken)}/reject`,
    { method: "POST" },
  );
}

export async function createJobTicket(jobId: string): Promise<JobTicket> {
  return request<JobTicket>(
    `/v1/ws/jobs/${encodeURIComponent(jobId)}/ticket`,
    { method: "POST" },
  );
}
