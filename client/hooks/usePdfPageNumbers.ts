import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pdfShowPageNumbers";

export function usePdfPageNumbers() {
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "false") {
        setShowPageNumbers(false);
      } else if (saved === "true") {
        setShowPageNumbers(true);
      }
    });
  }, []);

  function saveShowPageNumbers(value: boolean) {
    setShowPageNumbers(value);
    AsyncStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  }

  return { showPageNumbers, saveShowPageNumbers };
}
