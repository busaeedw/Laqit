import PDFDocument from "pdfkit";
import * as path from "path";

const AMIRI_FONT_PATH = path.resolve(process.cwd(), "server/assets/fonts/Amiri-Regular.ttf");

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

// Private/reserved IP patterns that must not be fetched server-side (SSRF guard).
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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

async function fetchImageBuffer(uri: string): Promise<Buffer | null> {
  if (!isSafeImageUri(uri)) {
    console.warn(`[analysisPdf] Image URI rejected by SSRF guard: ${uri.slice(0, 80)}`);
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(uri, {
      signal: controller.signal,
      redirect: "error",
    });

    if (!resp.ok) {
      console.warn(`[analysisPdf] Image fetch failed: HTTP ${resp.status}`);
      return null;
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(`[analysisPdf] Rejected non-image content-type: ${contentType}`);
      return null;
    }

    const contentLength = parseInt(resp.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_IMAGE_BYTES) {
      console.warn(`[analysisPdf] Image too large (content-length): ${contentLength}`);
      return null;
    }

    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      console.warn(`[analysisPdf] Image too large after download: ${arrayBuffer.byteLength}`);
      return null;
    }

    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.warn(`[analysisPdf] Image fetch error: ${err?.message ?? err}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateAnalysisPdf(
  carInfo: CarInfo,
  parts: PartEntry[],
  imageUri?: string
): Promise<Buffer> {
  const imageBuffer = imageUri ? await fetchImageBuffer(imageUri) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Register Arabic font (Amiri — full OpenType shaping via fontkit)
    doc.registerFont("Arabic", AMIRI_FONT_PATH);

    const blue = "#1E74F2";
    const gray = "#6B7280";
    const light = "#F3F4F6";
    const dark = "#111827";
    const pageWidth = doc.page.width - 100;



    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(50, 40, pageWidth, 60).fill(blue);

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#FFFFFF")
      .text("Laqit", 50, 52, { width: pageWidth / 2, align: "left" });

    doc
      .font("Arabic")
      .fontSize(18)
      .fillColor("#FFFFFF")
      .text("لاقط", 50, 52, { width: pageWidth, align: "right" });

    doc.moveDown(3);

    // ── Report title & date ───────────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(dark)
      .text("Car Damage Analysis Report", 50, 120, { width: pageWidth, align: "center" });

    doc
      .font("Arabic")
      .fontSize(13)
      .fillColor(dark)
      .text("تقرير تشخيص أضرار السيارة", 50, 138, { width: pageWidth, align: "center" });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(gray)
      .text(`Date: ${dateStr}`, 50, 158, { width: pageWidth, align: "center" });

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveDown(1.2);
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(blue).lineWidth(1.5).stroke();
    doc.moveDown(1);

    // ── Car info section ──────────────────────────────────────────────────────
    const carY = doc.y;
    doc.rect(50, carY, pageWidth, 28).fill(light);

    // Section label: bilingual
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(blue)
      .text("Vehicle Information", 55, carY + 8, { width: pageWidth * 0.5, align: "left" });

    doc
      .font("Arabic")
      .fontSize(12)
      .fillColor(blue)
      .text("معلومات السيارة", 50, carY + 8, { width: pageWidth - 10, align: "right" });

    doc.moveDown(0.3);

    const colW = pageWidth / 3;
    const labelY = doc.y + 4;
    const valueY = labelY + 14;

    // Column labels (Latin)
    doc.font("Helvetica").fontSize(9).fillColor(gray)
      .text("Make", 50, labelY, { width: colW })
      .text("Model", 50 + colW, labelY, { width: colW })
      .text("Year", 50 + colW * 2, labelY, { width: colW });

    // Make: Arabic + English
    doc.font("Arabic").fontSize(12).fillColor(dark)
      .text(carInfo.makeAr, 50, valueY, { width: colW, align: "left" });
    doc.font("Helvetica").fontSize(10).fillColor(gray)
      .text(`(${carInfo.make})`, 50, valueY + 14, { width: colW });

    // Model: Arabic + English
    doc.font("Arabic").fontSize(12).fillColor(dark)
      .text(carInfo.modelAr, 50 + colW, valueY, { width: colW, align: "left" });
    doc.font("Helvetica").fontSize(10).fillColor(gray)
      .text(`(${carInfo.model})`, 50 + colW, valueY + 14, { width: colW });

    // Year (Latin only)
    doc.font("Helvetica-Bold").fontSize(13).fillColor(dark)
      .text(carInfo.year, 50 + colW * 2, valueY, { width: colW });

    doc.moveDown(3.2);

    // ── Damage photo (if available) ───────────────────────────────────────────
    if (imageBuffer) {
      const imgSectionY = doc.y;
      doc.rect(50, imgSectionY, pageWidth, 28).fill(light);

      doc.font("Helvetica-Bold").fontSize(11).fillColor(blue)
        .text("Damage Photo", 55, imgSectionY + 8, { width: pageWidth * 0.5, align: "left" });
      doc.font("Arabic").fontSize(12).fillColor(blue)
        .text("صورة الضرر", 50, imgSectionY + 8, { width: pageWidth - 10, align: "right" });

      doc.moveDown(0.5);

      const maxImgWidth = pageWidth;
      const maxImgHeight = 200;

      try {
        doc.image(imageBuffer, 50, doc.y, {
          fit: [maxImgWidth, maxImgHeight],
          align: "center",
          valign: "center",
        });
        // Advance cursor past the image
        doc.y = Math.max(doc.y, imgSectionY + 28 + maxImgHeight + 8);
      } catch (imgErr: any) {
        console.warn(`[analysisPdf] Could not embed image: ${imgErr?.message}`);
        doc.font("Helvetica").fontSize(10).fillColor(gray)
          .text("[Photo could not be embedded]", 50, doc.y, { width: pageWidth, align: "center" });
        doc.moveDown(1);
      }
    }

    doc.moveDown(0.5);

    // ── Parts table ───────────────────────────────────────────────────────────
    if (doc.y > doc.page.height - 150) doc.addPage();

    const tableActualY = doc.y;
    doc.rect(50, tableActualY, pageWidth, 28).fill(blue);

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF")
      .text("Detected Parts", 55, tableActualY + 8, { width: pageWidth * 0.5, align: "left" });
    doc.font("Arabic").fontSize(13).fillColor("#FFFFFF")
      .text("القطع المكتشفة", 50, tableActualY + 7, { width: pageWidth - 10, align: "right" });

    // Column widths
    const c1 = 50;                          // Arabic name
    const c2 = 50 + pageWidth * 0.36;       // English name
    const c3 = 50 + pageWidth * 0.63;       // Confidence
    const c4 = 50 + pageWidth * 0.78;       // Price

    let rowTop = tableActualY + 28 + 5;

    // Header row labels
    doc.font("Helvetica-Bold").fontSize(8).fillColor(gray)
      .text("Arabic Name", c1, rowTop, { width: pageWidth * 0.34 })
      .text("English Name", c2, rowTop, { width: pageWidth * 0.25 })
      .text("Confidence", c3, rowTop, { width: pageWidth * 0.14 })
      .text("Est. Price (SAR)", c4, rowTop, { width: pageWidth * 0.22 });

    // Arabic header label above column
    doc.font("Arabic").fontSize(9).fillColor(gray)
      .text("الاسم بالعربية", c1, rowTop, { width: pageWidth * 0.34, align: "right" });

    rowTop += 18;
    doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop).strokeColor("#E5E7EB").lineWidth(0.5).stroke();

    // Data rows
    parts.forEach((part, i) => {
      if (rowTop > doc.page.height - 100) {
        doc.addPage();
        rowTop = 60;
      }

      if (i % 2 === 0) {
        doc.rect(50, rowTop, pageWidth, 24).fill(light);
      }

      const conf = part.confidence;
      const confColor =
        conf >= 90 ? "#16A34A" :
        conf >= 75 ? "#22C55E" :
        conf >= 60 ? "#D97706" : "#DC2626";

      // Arabic name column — Amiri font
      doc.font("Arabic").fontSize(10).fillColor(dark)
        .text(part.nameAr, c1, rowTop + 6, { width: pageWidth * 0.34, align: "right" });

      // English name — Helvetica
      doc.font("Helvetica").fontSize(9).fillColor(dark)
        .text(part.name, c2, rowTop + 8, { width: pageWidth * 0.25 });

      // Confidence — colored
      doc.font("Helvetica-Bold").fontSize(9).fillColor(confColor)
        .text(`${conf}%`, c3, rowTop + 8, { width: pageWidth * 0.14 });

      // Price — Helvetica
      doc.font("Helvetica").fontSize(9).fillColor(dark)
        .text(`${part.price.toLocaleString()} SAR`, c4, rowTop + 8, { width: pageWidth * 0.22 });

      rowTop += 24;
      doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop).strokeColor("#E5E7EB").lineWidth(0.3).stroke();
    });

    // ── Total ─────────────────────────────────────────────────────────────────
    const total = parts.reduce((sum, p) => sum + p.price, 0);

    doc.y = rowTop + 8;
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(blue).lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").fontSize(11).fillColor(dark)
      .text(`Total Estimated: ${total.toLocaleString()} SAR`, 50, doc.y, {
        width: pageWidth * 0.5,
      });

    doc.font("Arabic").fontSize(12).fillColor(dark)
      .text(`الإجمالي التقديري: ${total.toLocaleString()} ريال`, 50, doc.y - 16, {
        width: pageWidth,
        align: "right",
      });

    // ── Footer (Latin line + Arabic line) ────────────────────────────────────
    const footerY = doc.page.height - 56;
    doc.font("Helvetica").fontSize(8).fillColor(gray)
      .text("Generated by Laqit | laqit.app — All prices are estimates only.", 50, footerY, {
        width: pageWidth,
        align: "center",
      });
    doc.font("Arabic").fontSize(8).fillColor(gray)
      .text("جميع الأسعار تقديرية — لاقط", 50, footerY + 12, {
        width: pageWidth,
        align: "center",
      });

    doc.end();
  });
}
