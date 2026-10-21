export type UserRole = "taxpayer" | "accountant" | "admin";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  firm_id: string | null;
  accountant_id: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  city: string | null;
  department: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  document_type?: string;
  document_number?: string;
  phone?: string;
}

export interface DeclarationListItem {
  id: string;
  user_id: string;
  tax_form_id: string;
  tax_year: number;
  status: string;
  gross_income: string;
  total_tax_owed: string;
  total_withholdings: string;
  balance_to_pay: string;
  balance_in_favor: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface FormValue {
  field_code: string;
  field_name: string;
  box_number: number | null;
  value_numeric: string | null;
  value_text: string | null;
  confidence: number;
  is_manually_entered: boolean;
  source_document_id: string | null;
  updated_at: string | null;
}

export interface DeclarationDetail {
  id: string;
  user_id: string;
  tax_form_id: string | null;
  tax_year: number;
  status: string;
  observations: string | null;
  gross_income: string;
  total_tax_owed: string;
  total_withholdings: string;
  balance_to_pay: string;
  balance_in_favor: string;
  form_values: FormValue[];
  created_at: string | null;
  updated_at: string | null;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DeclarationListParams {
  page?: number;
  page_size?: number;
  status?: string;
  tax_year?: number;
  taxpayer_id?: string;
}

export interface CreateDeclarationResult {
  job_id: string;
  declaration_id: string;
  status: string;
}

export interface CorrectionResponse {
  id: string;
  declaration_id: string;
  document_id: string;
  field_name: string;
  original_value: string | null;
  corrected_value: string | null;
  confidence: number | null;
  corrected_by: string | null;
  created_at: string | null;
}

export interface DianCapabilities {
  phase: number;
  environment: string;
  signing_enabled: boolean;
  submission_enabled: boolean;
  sandbox_enabled: boolean;
  certificate_expires_at: string | null;
  signature_algorithm: string | null;
  invoice_schema: string;
  supported_documents: string[];
  supported_tax_years: number[];
  max_xml_bytes: number;
}

export interface Firm {
  id: string;
  name: string;
  nit: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string;
  member_count?: number;
  client_count?: number;
}

export interface FirmMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean | null;
  created_at: string;
  accountant_id: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly payload: unknown;

  constructor(status: number, detail: string, payload?: unknown) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.payload = payload;
  }
}
