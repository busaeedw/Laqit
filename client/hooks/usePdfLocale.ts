import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PdfLocale = "ar" | "en" | "bilingual";

const STORAGE_KEY = "pdfLocale";

export function usePdfLocale() {
  const [pdfLocale, setPdfLocale] = useState<PdfLocale>("ar");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "ar" || saved === "en" || saved === "bilingual") {
        setPdfLocale(saved);
      }
    });
  }, []);

  function savePdfLocale(locale: PdfLocale) {
    setPdfLocale(locale);
    AsyncStorage.setItem(STORAGE_KEY, locale);
  }

  return { pdfLocale, savePdfLocale };
}
