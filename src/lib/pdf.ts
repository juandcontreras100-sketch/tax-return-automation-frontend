/**
 * Utilidades de descarga de PDF sin dependencias externas.
 */

/**
 * Descarga un Blob usando una URL temporal y libera la URL al terminar.
 * Debe ejecutarse en el navegador (por ejemplo, desde un manejador de click).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Dar margen al navegador para iniciar la descarga antes de revocar la URL.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

/**
 * Construye un nombre de archivo ASCII, corto y seguro para la declaración.
 * Evita separadores de ruta y caracteres reservados de Windows/macOS.
 */
export function safePdfFilename(taxYear: number, id: string): string {
  const yearPart =
    String(taxYear).replace(/[^0-9]/g, "").slice(0, 4) || "sin-ano";
  const idPart =
    String(id)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toLowerCase() || "sin-id";

  return `declaracion-renta-${yearPart}-${idPart}.pdf`;
}
