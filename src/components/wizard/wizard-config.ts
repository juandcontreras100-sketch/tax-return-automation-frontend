export const TAX_YEARS = [2024, 2025, 2026] as const;

export type TaxYear = (typeof TAX_YEARS)[number];

export const DEFAULT_TAX_YEAR: TaxYear = 2025;

export type WizardStep = 1 | 2 | 3;

export type CausalValue =
  | "gross_equity_over_4500_uvt"
  | "income_over_1400_uvt"
  | "credit_card_over_1400_uvt"
  | "purchases_over_1400_uvt"
  | "bank_deposits_over_1400_uvt"
  | "none";

export type CausalOption = {
  value: CausalValue;
  label: string;
  description: string;
};

export const CAUSAL_OPTIONS: readonly CausalOption[] = [
  {
    value: "gross_equity_over_4500_uvt",
    label: "Patrimonio bruto superior a 4.500 UVT",
    description:
      "Al 31 de diciembre, el total de tus bienes y derechos supera ese tope.",
  },
  {
    value: "income_over_1400_uvt",
    label: "Ingresos brutos superiores a 1.400 UVT",
    description:
      "La suma de tus ingresos de todas las fuentes durante el año gravable.",
  },
  {
    value: "credit_card_over_1400_uvt",
    label: "Consumos con tarjeta de crédito superiores a 1.400 UVT",
    description:
      "Compras, avances y demás consumos realizados con tarjetas de crédito.",
  },
  {
    value: "purchases_over_1400_uvt",
    label: "Compras y consumos totales superiores a 1.400 UVT",
    description:
      "Adquisiciones de bienes y servicios realizadas durante el año.",
  },
  {
    value: "bank_deposits_over_1400_uvt",
    label: "Consignaciones bancarias o depósitos superiores a 1.400 UVT",
    description:
      "Incluye cuentas de ahorro, corriente y otros depósitos financieros.",
  },
  {
    value: "none",
    label: "Ninguna de las anteriores / No declaro",
    description:
      "No cumples ninguna causal y no estás obligado a declarar renta este año.",
  },
];

const causalLabels = new Map<CausalValue, string>(
  CAUSAL_OPTIONS.map((option) => [option.value, option.label]),
);

export function causalLabel(value: CausalValue): string {
  return causalLabels.get(value) ?? value;
}

export function orderedCausals(
  selected: readonly CausalValue[],
): CausalValue[] {
  return CAUSAL_OPTIONS.map((option) => option.value).filter((value) =>
    selected.includes(value),
  );
}

export type DocumentCategory = "rut" | "income_certificate" | "bank_statement";

export type DocumentDefinition = {
  category: DocumentCategory;
  label: string;
  shortLabel: string;
  description: string;
  required: boolean;
  multiple: boolean;
};

export const DOCUMENT_DEFINITIONS: readonly DocumentDefinition[] = [
  {
    category: "rut",
    label: "RUT (Registro Único Tributario)",
    shortLabel: "RUT",
    description:
      "Documento vigente expedido por la DIAN. Allí verificamos tu identificación y actividad económica.",
    required: true,
    multiple: false,
  },
  {
    category: "income_certificate",
    label: "Certificado de ingresos y retenciones",
    shortLabel: "certificado de ingresos",
    description:
      "Certificado laboral o de ingresos del año gravable, con los valores pagados y retenidos.",
    required: true,
    multiple: false,
  },
  {
    category: "bank_statement",
    label: "Extractos bancarios",
    shortLabel: "extractos bancarios",
    description:
      "Opcional. Adjúntalos si quieres que revisemos consignaciones, rendimientos o movimientos relevantes.",
    required: false,
    multiple: true,
  },
];

export type SelectedDocuments = Record<DocumentCategory, File[]>;
export type DocumentErrors = Record<DocumentCategory, string | null>;

export function createEmptyDocuments(): SelectedDocuments {
  return {
    rut: [],
    income_certificate: [],
    bank_statement: [],
  };
}

export function createEmptyDocumentErrors(): DocumentErrors {
  return {
    rut: null,
    income_certificate: null,
    bank_statement: null,
  };
}

export const PDF_MIME_TYPE = "application/pdf";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "10 MB";

const fileSizeFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
});

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${fileSizeFormatter.format(bytes)} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${fileSizeFormatter.format(kilobytes)} KB`;
  }

  return `${fileSizeFormatter.format(kilobytes / 1024)} MB`;
}

/**
 * El backend solo acepta PDF reales. Validamos MIME, extensión y tamaño antes
 * de adjuntar el archivo para dar retroalimentación inmediata.
 */
export function validatePdfFile(file: File): string | null {
  if (file.size === 0) {
    return "El archivo está vacío.";
  }
  if (file.type !== PDF_MIME_TYPE) {
    return "Solo se permiten archivos PDF (application/pdf).";
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "El archivo debe tener extensión .pdf.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `El archivo supera el máximo de ${MAX_FILE_SIZE_LABEL} por archivo.`;
  }
  return null;
}

export function requiredDocumentsProgress(documents: SelectedDocuments): {
  ready: number;
  total: number;
} {
  const required = DOCUMENT_DEFINITIONS.filter(
    (definition) => definition.required,
  );
  return {
    ready: required.filter(
      (definition) => documents[definition.category].length > 0,
    ).length,
    total: required.length,
  };
}
