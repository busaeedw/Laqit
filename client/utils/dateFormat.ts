/**
 * Formats a date in both Gregorian and Hijri (Islamic Umm al-Qura) calendars.
 * Returns a two-line string: Gregorian on top, Hijri below with "هـ" suffix.
 */

const gregorianFmt = new Intl.DateTimeFormat("ar-SA", {
  calendar: "gregory",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const hijriFmt = new Intl.DateTimeFormat("ar-SA", {
  calendar: "islamic-umalqura",
  year: "numeric",
  month: "long",
  day: "numeric",
  numberingSystem: "arab",
});

const gregorianTimeFmt = new Intl.DateTimeFormat("ar-SA", {
  calendar: "gregory",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const hijriTimeFmt = new Intl.DateTimeFormat("ar-SA", {
  calendar: "islamic-umalqura",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  numberingSystem: "arab",
});

export interface DualDate {
  gregorian: string;
  hijri: string;
  /** Combined single-line: "١٥ مارس ٢٠٢٦ | ١٥ رمضان ١٤٤٧ هـ" */
  combined: string;
}

export function formatDualDate(dateInput: string | Date, includeTime = false): DualDate {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const gFmt = includeTime ? gregorianTimeFmt : gregorianFmt;
  const hFmt = includeTime ? hijriTimeFmt : hijriFmt;

  const gregorian = gFmt.format(date);
  // The ar-SA islamic-umalqura formatter includes "هـ" in the correct position
  const hijri = hFmt.format(date);
  const combined = `${gregorian} | ${hijri}`;

  return { gregorian, hijri, combined };
}

/** Convenience: returns the combined "Gregorian | Hijri هـ" string */
export function formatDate(dateInput: string | Date, includeTime = false): string {
  return formatDualDate(dateInput, includeTime).combined;
}
