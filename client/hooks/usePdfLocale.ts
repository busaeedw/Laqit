import { useState } from "react";

export type PdfLocale = "ar" | "en";

export function usePdfLocale() {
  const [pdfLocale, setPdfLocale] = useState<PdfLocale>("ar");

  function savePdfLocale(locale: PdfLocale) {
    setPdfLocale(locale);
  }

  return { pdfLocale, savePdfLocale };
}
