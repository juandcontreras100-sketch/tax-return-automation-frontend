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
  type Pagina,
  type RegisterPayload,
  type TokenResponse,
  type User,
} from "./types";

export { ApiError } from "./types";

const DEFAULT_API_URL = "http://127.0.0.1:8080/api";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, "");

type SessionAdapter = {
  getRefreshToken: () => string | null;
  onTokensRefreshed: (tokens: TokenResponse) => void;
  onSessionExpired: () => void;
};

let sessionAdapter: SessionAdapter | null = null;

/**
 * Conecta el cliente HTTP con la sesión del AuthProvider. Así cualquier
 * petición autenticada puede refrescar el token una sola vez y reintentarse.
 */
export function setSessionAdapter(adapter: SessionAdapter | null): void {
  sessionAdapter = adapter;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string | null;
  json?: unknown;
  body?: BodyInit | null;
  headers?: HeadersInit;
  retryOnUnauthorized?: boolean;
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

function buildFetchInit(
  options: RequestOptions,
  token: string | null,
): RequestInit {
  const headers = new Headers(options.headers);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    method: options.method ?? "GET",
    headers,
    body:
      options.json !== undefined
        ? JSON.stringify(options.json)
        : options.body,
    cache: "no-store",
  };
}

async function performFetch(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  return fetch(`${API_URL}${path}`, buildFetchInit(options, token));
}

let refreshInFlight: Promise<TokenResponse> | null = null;

async function refreshAccessToken(): Promise<TokenResponse | null> {
  const adapter = sessionAdapter;
  const refreshToken = adapter?.getRefreshToken() ?? null;

  if (!adapter || !refreshToken) {
    adapter?.onSessionExpired();
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = refresh(refreshToken)
      .then((tokens) => {
        adapter.onTokensRefreshed(tokens);
        return tokens;
      })
      .catch(() => {
        adapter.onSessionExpired();
        throw new Error("La sesión expiró. Inicia sesión de nuevo.");
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  try {
    return await refreshInFlight;
  } catch {
    return null;
  }
}

async function fetchWithSession(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const token = options.token ?? null;
  let response = await performFetch(path, options, token);

  if (
    response.status === 401 &&
    token &&
    options.retryOnUnauthorized !== false
  ) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await performFetch(path, options, refreshed.access_token);

      if (response.status === 401) {
        sessionAdapter?.onSessionExpired();
      }
    }
  }

  return response;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetchWithSession(path, options);

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
): Promise<TokenResponse> {
  return request<TokenResponse>("/v1/auth/login", {
    method: "POST",
    json: { email, password },
  });
}

export async function register(payload: RegisterPayload): Promise<User> {
  return request<User>("/v1/auth/register", {
    method: "POST",
    json: payload,
  });
}

export async function me(token: string): Promise<User> {
  return request<User>("/v1/auth/me", { token });
}

export async function refresh(refreshToken: string): Promise<TokenResponse> {
  return request<TokenResponse>("/v1/auth/refresh", {
    method: "POST",
    json: { refresh_token: refreshToken },
    retryOnUnauthorized: false,
  });
}

export async function logout(refreshToken: string): Promise<void> {
  return request<void>("/v1/auth/logout", {
    method: "POST",
    json: { refresh_token: refreshToken },
    retryOnUnauthorized: false,
  });
}

export async function listDeclarations(
  token: string,
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
    { token },
  );
}

export async function getDeclaration(
  token: string,
  id: string,
): Promise<DeclarationDetail> {
  return request<DeclarationDetail>(
    `/v1/declarations/${encodeURIComponent(id)}`,
    { token },
  );
}

export async function downloadDeclarationPdf(
  token: string,
  id: string,
): Promise<Blob> {
  const path = `/v1/declarations/${encodeURIComponent(id)}/pdf`;
  const response = await fetchWithSession(path, {
    token,
    headers: { Accept: "application/pdf" },
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response.blob();
}

export async function createDeclaration(
  token: string,
  formData: FormData,
): Promise<CreateDeclarationResult> {
  return request<CreateDeclarationResult>("/v1/declarations", {
    method: "POST",
    token,
    body: formData,
  });
}

export async function updateDeclarationValue(
  token: string,
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
      token,
      json: payload,
    },
  );
}

export async function getDianCapabilities(
  token: string,
): Promise<DianCapabilities> {
  return request<DianCapabilities>("/v1/dian/capabilities", { token });
}

export async function getMyFirm(token: string): Promise<Firm> {
  return request<Firm>("/v1/firms/me", { token });
}

export async function listFirmMembers(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Pagina<FirmMember>> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.page_size ?? 100),
  });
  return request<Pagina<FirmMember>>(
    `/v1/firms/me/members?${search.toString()}`,
    { token },
  );
}

export async function listFirmClients(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Pagina<FirmMember>> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.page_size ?? 100),
  });
  return request<Pagina<FirmMember>>(
    `/v1/firms/me/clients?${search.toString()}`,
    { token },
  );
}

export async function assignClientAccountant(
  token: string,
  clientId: string,
  accountantId: string | null,
): Promise<FirmMember> {
  return request<FirmMember>(
    `/v1/firms/me/clients/${encodeURIComponent(clientId)}/accountant`,
    {
      method: "PATCH",
      token,
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

export async function createFirmInvitation(
  token: string,
  payload: { email: string; role: FirmInvitationRole },
): Promise<FirmInvitationCreated> {
  return request<FirmInvitationCreated>("/v1/firms/me/invitations", {
    method: "POST",
    token,
    json: payload,
  });
}

export async function listFirmInvitations(
  token: string,
  params: FirmInvitationListParams = {},
): Promise<Pagina<FirmInvitation>> {
  return request<Pagina<FirmInvitation>>(
    `/v1/firms/me/invitations?${buildInvitationSearch(params)}`,
    { token },
  );
}

export async function revokeFirmInvitation(
  token: string,
  invitationId: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/me/invitations/${encodeURIComponent(invitationId)}/revoke`,
    { method: "POST", token },
  );
}

export async function listMyInvitations(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Pagina<FirmInvitation>> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(params.page_size ?? 20),
  });
  return request<Pagina<FirmInvitation>>(
    `/v1/firms/invitations?${search.toString()}`,
    { token },
  );
}

export async function previewFirmInvitation(
  token: string,
  invitationToken: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/invitations/${encodeURIComponent(invitationToken)}`,
    { token },
  );
}

export async function acceptFirmInvitation(
  token: string,
  invitationToken: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/invitations/${encodeURIComponent(invitationToken)}/accept`,
    { method: "POST", token },
  );
}

export async function rejectFirmInvitation(
  token: string,
  invitationToken: string,
): Promise<FirmInvitation> {
  return request<FirmInvitation>(
    `/v1/firms/invitations/${encodeURIComponent(invitationToken)}/reject`,
    { method: "POST", token },
  );
}
