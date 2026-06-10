import PDFDocument from "pdfkit";
import * as path from "path";

const AMIRI_FONT_PATH = path.resolve(process.cwd(), "server/assets/fonts/Amiri-Regular.ttf");
const AMIRI_BOLD_FONT_PATH = path.resolve(process.cwd(), "server/assets/fonts/Amiri-Bold.ttf");

// ── PDF color palette ──────────────────────────────────────────────────────────
const PDF_COLOR_BLUE   = "#1E74F2";
const PDF_COLOR_GRAY   = "#6B7280";
const PDF_COLOR_LIGHT  = "#F3F4F6";
const PDF_COLOR_DARK   = "#111827";
const PDF_COLOR_WHITE  = "#FFFFFF";
const PDF_COLOR_BORDER = "#E5E7EB";

// Confidence-level traffic-light palette (applied to percentage badges)
const PDF_CONFIDENCE_VERY_HIGH = "#16A34A"; // >= 90 %
const PDF_CONFIDENCE_HIGH      = "#22C55E"; // >= 75 %
const PDF_CONFIDENCE_MEDIUM    = "#D97706"; // >= 60 %
const PDF_CONFIDENCE_LOW       = "#DC2626"; // <  60 %

export type PdfLocale = "ar" | "en" | "bilingual";

export interface CarInfo {
  make: string;
  makeAr: string;
  model: string;
  modelAr: string;
  year: string;
}

export interface PartEntry {
  id: string;
  name: string;
  nameAr: string;
  confidence: number;
  price: number;
}

// ── SSRF guard ────────────────────────────────────────────────────────────────

const PRIVATE_HOSTNAME_RE =
  /^(localhost|.*\.local)$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^169\.254\.|^\[?::1\]?$|^\[?fc|^\[?fd/i;

function isSafeImageUri(uri: string): boolean {
  if (!uri.startsWith("https://")) return false;
  try {
    const { hostname } = new URL(uri);
    if (PRIVATE_HOSTNAME_RE.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function fetchImageBuffer(uri: string): Promise<Buffer | null> {
  if (!isSafeImageUri(uri)) {
    console.warn(`[analysisPdf] Image URI rejected by SSRF guard: ${uri.slice(0, 80)}`);
    return null;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(uri, { signal: controller.signal, redirect: "error" });
    if (!resp.ok) { console.warn(`[analysisPdf] Image fetch failed: HTTP ${resp.status}`); return null; }
    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) { console.warn(`[analysisPdf] Rejected non-image: ${contentType}`); return null; }
    const contentLength = parseInt(resp.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_IMAGE_BYTES) { console.warn(`[analysisPdf] Image too large (header): ${contentLength}`); return null; }
    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) { console.warn(`[analysisPdf] Image too large (body): ${arrayBuffer.byteLength}`); return null; }
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.warn(`[analysisPdf] Image fetch error: ${err?.message ?? err}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Label sets ────────────────────────────────────────────────────────────────

// Each locale has separate ar (Arabic) and en (English) string slots.
// For ar-only and en-only, the unused slot is empty string.
// Bilingual uses both via explicit two-draw rendering.
interface LocaleLabels {
  // header bar
  appNameEn: string;
  appNameAr: string;
  // report title
  reportTitleEn: string;
  reportTitleAr: string;
  // date
  dateLabel: string;
  // vehicle info section
  vehicleInfoEn: string;
  vehicleInfoAr: string;
  makeLabel: string;
  modelLabel: string;
  yearLabel: string;
  // damage photo
  damagePhotoEn: string;
  damagePhotoAr: string;
  photoError: string;
  // parts table
  detectedPartsEn: string;
  detectedPartsAr: string;
  // table column labels
  colNameEn: string;
  colNameAr: string;
  colConfidence: string;
  colPrice: string;
  // total
  totalEn: (a: string) => string;
  totalAr: (a: string) => string;
  // footer
  footerEn: string;
  footerAr: string;
}

const LABELS: Record<PdfLocale, LocaleLabels> = {
  ar: {
    appNameEn: "",
    appNameAr: "لاقط",
    reportTitleEn: "",
    reportTitleAr: "تقرير تشخيص أضرار السيارة",
    dateLabel: "التاريخ",
    vehicleInfoEn: "",
    vehicleInfoAr: "معلومات السيارة",
    makeLabel: "الصنع",
    modelLabel: "الموديل",
    yearLabel: "السنة",
    damagePhotoEn: "",
    damagePhotoAr: "صورة الضرر",
    photoError: "[تعذّر تضمين الصورة]",
    detectedPartsEn: "",
    detectedPartsAr: "القطع المكتشفة",
    colNameEn: "",
    colNameAr: "اسم القطعة",
    colConfidence: "الثقة",
    colPrice: "السعر التقديري (ريال)",
    totalEn: () => "",
    totalAr: (a) => `الإجمالي التقديري: ${a} ريال`,
    footerEn: "",
    footerAr: "جميع الأسعار تقديرية — لاقط | laqit.app",
  },
  en: {
    appNameEn: "Laqit",
    appNameAr: "",
    reportTitleEn: "Car Damage Analysis Report",
    reportTitleAr: "",
    dateLabel: "Date",
    vehicleInfoEn: "Vehicle Information",
    vehicleInfoAr: "",
    makeLabel: "Make",
    modelLabel: "Model",
    yearLabel: "Year",
    damagePhotoEn: "Damage Photo",
    damagePhotoAr: "",
    photoError: "[Photo could not be embedded]",
    detectedPartsEn: "Detected Parts",
    detectedPartsAr: "",
    colNameEn: "Part Name",
    colNameAr: "",
    colConfidence: "Confidence",
    colPrice: "Est. Price (SAR)",
    totalEn: (a) => `Total Estimated: ${a} SAR`,
    totalAr: () => "",
    footerEn: "Generated by Laqit | laqit.app — All prices are estimates only.",
    footerAr: "",
  },
  bilingual: {
    appNameEn: "Laqit",
    appNameAr: "لاقط",
    reportTitleEn: "Car Damage Analysis Report",
    reportTitleAr: "تقرير تشخيص أضرار السيارة",
    dateLabel: "Date",
    vehicleInfoEn: "Vehicle Information",
    vehicleInfoAr: "معلومات السيارة",
    makeLabel: "Make",
    modelLabel: "Model",
    yearLabel: "Year",
    damagePhotoEn: "Damage Photo",
    damagePhotoAr: "صورة الضرر",
    photoError: "[Photo could not be embedded / تعذّر تضمين الصورة]",
    detectedPartsEn: "Detected Parts",
    detectedPartsAr: "القطع المكتشفة",
    colNameEn: "Part (English)",
    colNameAr: "اسم القطعة",
    colConfidence: "Confidence",
    colPrice: "Est. Price (SAR)",
    totalEn: (a) => `Total: ${a} SAR`,
    totalAr: (a) => `الإجمالي: ${a} ريال`,
    footerEn: "Generated by Laqit | laqit.app — All prices are estimates only.",
    footerAr: "جميع الأسعار تقديرية",
  },
};

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateAnalysisPdf(
  carInfo: CarInfo,
  parts: PartEntry[],
  imageUri?: string,
  locale: PdfLocale = "ar"
): Promise<Buffer> {
  const imageBuffer = imageUri ? await fetchImageBuffer(imageUri) : null;
  const L = LABELS[locale];
  const isAr = locale === "ar";
  const isEn = locale === "en";
  const isBilingual = locale === "bilingual";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ bufferPages: true, margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Arabic", AMIRI_FONT_PATH);
    doc.registerFont("ArabicBold", AMIRI_BOLD_FONT_PATH);

    const blue  = PDF_COLOR_BLUE;
    const gray  = PDF_COLOR_GRAY;
    const light = PDF_COLOR_LIGHT;
    const dark  = PDF_COLOR_DARK;
    const white = PDF_COLOR_WHITE;
    const pageWidth = doc.page.width - 100;

    // ── Shared style configs ───────────────────────────────────────────────────

    // Table column header labels
    const tableHeaderStyle = {
      fontSizeAr: 9,
      fontSizeEn: 8,
      fillColor: gray,
    };

    // Table data rows
    const tableRowStyle = {
      height: 24,
      paddingTop: 8,
      fontSize: 9,
      fontSizeArName: 10, // Arabic part name in AR-only mode
      fillColor: dark,
      altBg: light,
    };

    // Thin divider lines between table rows
    const rowDividerStyle = {
      strokeColor: PDF_COLOR_BORDER,
      lineWidthHeader: 0.5, // separator after column headers
      lineWidthRow: 0.3,    // separator after each data row
    };

    // Total row text
    const totalStyle = {
      fontSizeAr: 12,
      fontSizeEn: 11,
      fillColor: dark,
    };

    // Horizontal rule dividers using the brand blue
    const dividerStyle = {
      strokeColor: blue,
      lineWidthSection: 1.5, // main section divider below title
      lineWidthTotal: 1,     // divider above the totals row
    };

    // Footer text (font size, color, and spacing between EN and AR lines)
    const footerStyle = { fontSize: 8, fillColor: gray, lineSpacing: 12 };

    // Page-number text in the bottom margin
    const pageNumberStyle = { fontSize: 7, fillColor: gray };

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Draw a section bar with separate Arabic (right) and/or English (left) label.
    const sectionBar = (y: number, arText: string, enText: string, bgColor = light) => {
      doc.rect(50, y, pageWidth, 28).fill(bgColor);
      const textY = y + 8;
      if (enText) {
        doc.font("Helvetica-Bold").fontSize(bgColor === blue ? 12 : 11)
          .fillColor(bgColor === blue ? white : blue)
          .text(enText, 55, textY, { width: pageWidth * 0.5, align: "left" });
      }
      if (arText) {
        doc.font("ArabicBold").fontSize(bgColor === blue ? 13 : 12)
          .fillColor(bgColor === blue ? white : blue)
          .text(arText, 50, textY, { width: pageWidth - 10, align: "right" });
      }
    };

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(50, 40, pageWidth, 60).fill(blue);

    if (L.appNameEn) {
      doc.font("Helvetica-Bold").fontSize(14).fillColor(white)
        .text(L.appNameEn, 50, 55, { width: pageWidth / 2, align: "left" });
    }
    if (L.appNameAr) {
      doc.font("ArabicBold").fontSize(18).fillColor(white)
        .text(L.appNameAr, 50, 55, { width: pageWidth, align: "right" });
    }

    doc.moveDown(3);

    // ── Report title & date ───────────────────────────────────────────────────
    const dateLocale = isAr ? "ar-SA" : "en-GB";
    const dateStr = new Date().toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let titleBottom = 120;
    if (L.reportTitleAr) {
      doc.font("ArabicBold").fontSize(isAr ? 15 : 13).fillColor(dark)
        .text(L.reportTitleAr, 50, 120, { width: pageWidth, align: "center" });
      titleBottom = isAr ? 125 : 120;
    }
    if (L.reportTitleEn) {
      const enTitleY = isEn ? 122 : 138;
      doc.font(isEn ? "Helvetica-Bold" : "Helvetica").fontSize(isEn ? 15 : 11).fillColor(isEn ? dark : gray)
        .text(L.reportTitleEn, 50, enTitleY, { width: pageWidth, align: "center" });
      titleBottom = enTitleY;
    }

    doc.font(isAr ? "Arabic" : "Helvetica").fontSize(9).fillColor(gray)
      .text(`${L.dateLabel}: ${dateStr}`, 50, titleBottom + 18, { width: pageWidth, align: "center" });

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveDown(isBilingual ? 0.5 : 1);
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y)
      .strokeColor(dividerStyle.strokeColor).lineWidth(dividerStyle.lineWidthSection).stroke();
    doc.moveDown(1);

    // ── Car info section ──────────────────────────────────────────────────────
    const carY = doc.y;
    sectionBar(carY, L.vehicleInfoAr, L.vehicleInfoEn, light);
    doc.moveDown(0.3);

    const colW = pageWidth / 3;
    const labelY = doc.y + 4;
    const valueY = labelY + 14;

    if (isBilingual) {
      doc.font("Helvetica").fontSize(9).fillColor(gray)
        .text(L.makeLabel, 50, labelY, { width: colW })
        .text(L.modelLabel, 50 + colW, labelY, { width: colW })
        .text(L.yearLabel, 50 + colW * 2, labelY, { width: colW });

      doc.font("Arabic").fontSize(12).fillColor(dark)
        .text(carInfo.makeAr, 50, valueY, { width: colW, align: "left" });
      doc.font("Helvetica").fontSize(10).fillColor(gray)
        .text(`(${carInfo.make})`, 50, valueY + 14, { width: colW });

      doc.font("Arabic").fontSize(12).fillColor(dark)
        .text(carInfo.modelAr, 50 + colW, valueY, { width: colW, align: "left" });
      doc.font("Helvetica").fontSize(10).fillColor(gray)
        .text(`(${carInfo.model})`, 50 + colW, valueY + 14, { width: colW });

      doc.font("Helvetica-Bold").fontSize(13).fillColor(dark)
        .text(carInfo.year, 50 + colW * 2, valueY, { width: colW });
    } else if (isAr) {
      doc.font("Arabic").fontSize(9).fillColor(gray)
        .text(L.makeLabel, 50, labelY, { width: colW, align: "right" })
        .text(L.modelLabel, 50 + colW, labelY, { width: colW, align: "right" })
        .text(L.yearLabel, 50 + colW * 2, labelY, { width: colW, align: "right" });

      doc.font("Arabic").fontSize(13).fillColor(dark)
        .text(carInfo.makeAr, 50, valueY, { width: colW, align: "right" });
      doc.font("Arabic").fontSize(13).fillColor(dark)
        .text(carInfo.modelAr, 50 + colW, valueY, { width: colW, align: "right" });
      doc.font("Helvetica-Bold").fontSize(13).fillColor(dark)
        .text(carInfo.year, 50 + colW * 2, valueY, { width: colW, align: "right" });
    } else {
      doc.font("Helvetica").fontSize(9).fillColor(gray)
        .text(L.makeLabel, 50, labelY, { width: colW })
        .text(L.modelLabel, 50 + colW, labelY, { width: colW })
        .text(L.yearLabel, 50 + colW * 2, labelY, { width: colW });

      doc.font("Helvetica-Bold").fontSize(12).fillColor(dark)
        .text(carInfo.make, 50, valueY, { width: colW });
      doc.font("Helvetica-Bold").fontSize(12).fillColor(dark)
        .text(carInfo.model, 50 + colW, valueY, { width: colW });
      doc.font("Helvetica-Bold").fontSize(13).fillColor(dark)
        .text(carInfo.year, 50 + colW * 2, valueY, { width: colW });
    }

    doc.moveDown(3.2);

    // ── Damage photo ──────────────────────────────────────────────────────────
    if (imageBuffer) {
      const imgSectionY = doc.y;
      sectionBar(imgSectionY, L.damagePhotoAr, L.damagePhotoEn, light);
      doc.moveDown(0.5);
      const maxImgHeight = 200;
      try {
        doc.image(imageBuffer, 50, doc.y, { fit: [pageWidth, maxImgHeight], align: "center", valign: "center" });
        doc.y = Math.max(doc.y, imgSectionY + 28 + maxImgHeight + 8);
      } catch (imgErr: any) {
        console.warn(`[analysisPdf] Could not embed image: ${imgErr?.message}`);
        doc.font(isAr ? "Arabic" : "Helvetica").fontSize(10).fillColor(gray)
          .text(L.photoError, 50, doc.y, { width: pageWidth, align: "center" });
        doc.moveDown(1);
      }
    }

    doc.moveDown(0.5);

    // ── Parts table ───────────────────────────────────────────────────────────
    if (doc.y > doc.page.height - 150) doc.addPage();

    const tableY = doc.y;
    sectionBar(tableY, L.detectedPartsAr, L.detectedPartsEn, blue);

    let rowTop = tableY + 28 + 5;

    const confColor = (c: number) =>
      c >= 90 ? PDF_CONFIDENCE_VERY_HIGH
      : c >= 75 ? PDF_CONFIDENCE_HIGH
      : c >= 60 ? PDF_CONFIDENCE_MEDIUM
      : PDF_CONFIDENCE_LOW;

    if (isBilingual) {
      // 4 columns: Arabic name | English name | Confidence | Price
      const c1 = 50;
      const c2 = 50 + pageWidth * 0.36;
      const c3 = 50 + pageWidth * 0.63;
      const c4 = 50 + pageWidth * 0.78;

      const drawBilingualHeaders = () => {
        doc.font("Arabic").fontSize(tableHeaderStyle.fontSizeAr).fillColor(tableHeaderStyle.fillColor)
          .text(L.colNameAr, c1, rowTop, { width: pageWidth * 0.34, align: "right" });
        doc.font("Helvetica-Bold").fontSize(tableHeaderStyle.fontSizeEn).fillColor(tableHeaderStyle.fillColor)
          .text(L.colNameEn, c2, rowTop, { width: pageWidth * 0.25 })
          .text(L.colConfidence, c3, rowTop, { width: pageWidth * 0.14 })
          .text(L.colPrice, c4, rowTop, { width: pageWidth * 0.22 });
        rowTop += 18;
        doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop)
          .strokeColor(rowDividerStyle.strokeColor).lineWidth(rowDividerStyle.lineWidthHeader).stroke();
      };

      drawBilingualHeaders();

      parts.forEach((part, i) => {
        if (rowTop > doc.page.height - 100) {
          doc.addPage(); rowTop = 60;
          sectionBar(rowTop, `(تابع) ${L.detectedPartsAr}`, `${L.detectedPartsEn} (Cont.)`);
          rowTop += 28;
          drawBilingualHeaders();
        }
        if (i % 2 === 0) doc.rect(50, rowTop, pageWidth, tableRowStyle.height).fill(tableRowStyle.altBg);

        doc.font("ArabicBold").fontSize(tableRowStyle.fontSize).fillColor(tableRowStyle.fillColor)
          .text(part.nameAr, c1, rowTop + tableRowStyle.paddingTop, { width: pageWidth * 0.34, align: "right" });
        doc.font("Helvetica-Bold").fontSize(tableRowStyle.fontSize).fillColor(tableRowStyle.fillColor)
          .text(part.name, c2, rowTop + tableRowStyle.paddingTop, { width: pageWidth * 0.25 });
        doc.font("Helvetica").fontSize(tableRowStyle.fontSize).fillColor(confColor(part.confidence))
          .text(`${part.confidence}%`, c3, rowTop + tableRowStyle.paddingTop, { width: pageWidth * 0.14 });
        doc.font("Helvetica").fontSize(tableRowStyle.fontSize).fillColor(tableRowStyle.fillColor)
          .text(`${part.price.toLocaleString()} SAR`, c4, rowTop + tableRowStyle.paddingTop, { width: pageWidth * 0.22 });

        rowTop += tableRowStyle.height;
        doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop)
          .strokeColor(rowDividerStyle.strokeColor).lineWidth(rowDividerStyle.lineWidthRow).stroke();
      });
    } else if (isAr) {
      // 3 columns, right-to-left: price | confidence | name
      const cName = 50;
      const cConf = 50 + pageWidth * 0.62;
      const cPrice = 50 + pageWidth * 0.78;
      const nameW = pageWidth * 0.60;
      const confW = pageWidth * 0.14;
      const priceW = pageWidth * 0.22;

      const drawArHeaders = () => {
        doc.font("Arabic").fontSize(tableHeaderStyle.fontSizeAr).fillColor(tableHeaderStyle.fillColor)
          .text(L.colPrice, cPrice, rowTop, { width: priceW, align: "right" })
          .text(L.colConfidence, cConf, rowTop, { width: confW, align: "right" })
          .text(L.colNameAr, cName, rowTop, { width: nameW, align: "right" });
        rowTop += 18;
        doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop)
          .strokeColor(rowDividerStyle.strokeColor).lineWidth(rowDividerStyle.lineWidthHeader).stroke();
      };

      drawArHeaders();

      parts.forEach((part, i) => {
        if (rowTop > doc.page.height - 100) {
          doc.addPage(); rowTop = 60;
          sectionBar(rowTop, `(تابع) ${L.detectedPartsAr}`, "");
          rowTop += 28;
          drawArHeaders();
        }
        if (i % 2 === 0) doc.rect(50, rowTop, pageWidth, tableRowStyle.height).fill(tableRowStyle.altBg);

        doc.font("ArabicBold").fontSize(tableRowStyle.fontSizeArName).fillColor(tableRowStyle.fillColor)
          .text(part.nameAr, cName, rowTop + tableRowStyle.paddingTop, { width: nameW, align: "right" });
        doc.font("Helvetica-Bold").fontSize(tableRowStyle.fontSize).fillColor(confColor(part.confidence))
          .text(`${part.confidence}%`, cConf, rowTop + tableRowStyle.paddingTop, { width: confW, align: "right" });
        doc.font("Helvetica").fontSize(tableRowStyle.fontSize).fillColor(tableRowStyle.fillColor)
          .text(`${part.price.toLocaleString()}`, cPrice, rowTop + tableRowStyle.paddingTop, { width: priceW, align: "right" });

        rowTop += tableRowStyle.height;
        doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop)
          .strokeColor(rowDividerStyle.strokeColor).lineWidth(rowDividerStyle.lineWidthRow).stroke();
      });
    } else {
      // 3 columns, LTR: name | confidence | price
      const cName = 50;
      const cConf = 50 + pageWidth * 0.62;
      const cPrice = 50 + pageWidth * 0.78;
      const nameW = pageWidth * 0.60;
      const confW = pageWidth * 0.14;
      const priceW = pageWidth * 0.22;

      const drawEnHeaders = () => {
        doc.font("Helvetica-Bold").fontSize(tableHeaderStyle.fontSizeEn).fillColor(tableHeaderStyle.fillColor)
          .text(L.colNameEn, cName, rowTop, { width: nameW })
          .text(L.colConfidence, cConf, rowTop, { width: confW })
          .text(L.colPrice, cPrice, rowTop, { width: priceW });
        rowTop += 18;
        doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop)
          .strokeColor(rowDividerStyle.strokeColor).lineWidth(rowDividerStyle.lineWidthHeader).stroke();
      };

      drawEnHeaders();

      parts.forEach((part, i) => {
        if (rowTop > doc.page.height - 100) {
          doc.addPage(); rowTop = 60;
          sectionBar(rowTop, "", `${L.detectedPartsEn} (Cont.)`);
          rowTop += 28;
          drawEnHeaders();
        }
        if (i % 2 === 0) doc.rect(50, rowTop, pageWidth, tableRowStyle.height).fill(tableRowStyle.altBg);

        doc.font("Helvetica").fontSize(tableRowStyle.fontSize).fillColor(tableRowStyle.fillColor)
          .text(part.name, cName, rowTop + tableRowStyle.paddingTop, { width: nameW });
        doc.font("Helvetica-Bold").fontSize(tableRowStyle.fontSize).fillColor(confColor(part.confidence))
          .text(`${part.confidence}%`, cConf, rowTop + tableRowStyle.paddingTop, { width: confW });
        doc.font("Helvetica").fontSize(tableRowStyle.fontSize).fillColor(tableRowStyle.fillColor)
          .text(`${part.price.toLocaleString()} SAR`, cPrice, rowTop + tableRowStyle.paddingTop, { width: priceW });

        rowTop += tableRowStyle.height;
        doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop)
          .strokeColor(rowDividerStyle.strokeColor).lineWidth(rowDividerStyle.lineWidthRow).stroke();
      });
    }

    // ── Total ─────────────────────────────────────────────────────────────────
    const total = parts.reduce((sum, p) => sum + p.price, 0);
    const totalStr = total.toLocaleString();

    doc.y = rowTop + 8;
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y)
      .strokeColor(dividerStyle.strokeColor).lineWidth(dividerStyle.lineWidthTotal).stroke();
    doc.moveDown(0.5);

    const totalY = doc.y;
    if (L.totalAr(totalStr)) {
      doc.font("ArabicBold").fontSize(totalStyle.fontSizeAr).fillColor(totalStyle.fillColor)
        .text(L.totalAr(totalStr), 50, totalY, { width: pageWidth, align: "right" });
    }
    if (L.totalEn(totalStr)) {
      doc.font("Helvetica-Bold").fontSize(totalStyle.fontSizeEn).fillColor(totalStyle.fillColor)
        .text(L.totalEn(totalStr), 50, isBilingual ? totalY : totalY, { width: isBilingual ? pageWidth * 0.5 : pageWidth, align: "left" });
    }

    // ── Disclaimer footer (last page only) ────────────────────────────────────
    const footerY = doc.page.height - 50;
    if (L.footerEn) {
      doc.font("Helvetica-Bold").fontSize(footerStyle.fontSize).fillColor(footerStyle.fillColor)
        .text(L.footerEn, 50, footerY, { width: pageWidth, align: "center" });
    }
    if (L.footerAr) {
      const arFooterY = L.footerEn ? footerY + footerStyle.lineSpacing : footerY;
      doc.font("ArabicBold").fontSize(footerStyle.fontSize).fillColor(footerStyle.fillColor)
        .text(L.footerAr, 50, arFooterY, { width: pageWidth, align: "center" });
    }

    // ── Page numbers (every page) ──────────────────────────────────────────────
    // pageNumY must stay within the page margin (< page.height - bottomMargin)
    // to avoid PDFKit's overflow guard triggering doc.addPage() in switchToPage loops.
    // We also reset doc.y to a safe value before each text draw for the same reason.
    const totalPages = doc.bufferedPageRange().count;
    if (totalPages > 1) {
      const pageNumY = doc.page.height - doc.page.margins.bottom - 14;
      for (let p = 0; p < totalPages; p++) {
        doc.switchToPage(p);
        doc.y = doc.page.margins.top; // prevent overflow-guard false-positive
        const pageNum = p + 1;
        if (isBilingual) {
          doc.font("Helvetica").fontSize(pageNumberStyle.fontSize).fillColor(pageNumberStyle.fillColor)
            .text(`Page ${pageNum} / ${totalPages}`, 50, pageNumY, { width: pageWidth * 0.5, align: "left", lineBreak: false });
          doc.y = doc.page.margins.top;
          doc.font("Arabic").fontSize(pageNumberStyle.fontSize).fillColor(pageNumberStyle.fillColor)
            .text(`${totalPages} / ${pageNum} صفحة`, 50 + pageWidth * 0.5, pageNumY, { width: pageWidth * 0.5, align: "right", lineBreak: false });
        } else if (isAr) {
          doc.font("Arabic").fontSize(pageNumberStyle.fontSize).fillColor(pageNumberStyle.fillColor)
            .text(`${totalPages} / ${pageNum} صفحة`, 50, pageNumY, { width: pageWidth, align: "right", lineBreak: false });
        } else {
          doc.font("Helvetica").fontSize(pageNumberStyle.fontSize).fillColor(pageNumberStyle.fillColor)
            .text(`Page ${pageNum} / ${totalPages}`, 50, pageNumY, { width: pageWidth, align: "left", lineBreak: false });
        }
      }
    }

    doc.end();
  });
}
