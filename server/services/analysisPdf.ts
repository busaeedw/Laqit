import PDFDocument from "pdfkit";

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
  // Only allow HTTPS — blocks http://, file://, data:, ftp:// etc.
  if (!uri.startsWith("https://")) return false;
  try {
    const { hostname } = new URL(uri);
    // Block private IPs, loopback, and link-local
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
      redirect: "error", // Never follow redirects — avoids redirect-based SSRF
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

    const blue = "#1E74F2";
    const gray = "#6B7280";
    const light = "#F3F4F6";
    const dark = "#111827";
    const pageWidth = doc.page.width - 100;

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(50, 40, pageWidth, 60).fill(blue);

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Laqit — لاقط", 50, 57, { width: pageWidth, align: "center" });

    doc.moveDown(3);

    // ── Report title & date ───────────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Car Damage Analysis Report", 50, 120, {
        width: pageWidth,
        align: "center",
      });

    doc
      .fillColor(gray)
      .font("Helvetica")
      .fontSize(11)
      .text(`Date: ${dateStr}`, 50, 142, { width: pageWidth, align: "center" });

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(blue).lineWidth(1.5).stroke();
    doc.moveDown(1);

    // ── Car info section ──────────────────────────────────────────────────────
    const carY = doc.y;
    doc.rect(50, carY, pageWidth, 28).fill(light);

    doc
      .fillColor(blue)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Vehicle Information / معلومات السيارة", 55, carY + 8, {
        width: pageWidth - 10,
        align: "left",
      });

    doc.moveDown(0.3);

    const colW = pageWidth / 3;
    const rowY = doc.y + 6;

    doc
      .fillColor(gray)
      .font("Helvetica")
      .fontSize(10)
      .text("Make / الماركة", 50, rowY, { width: colW })
      .text("Model / الموديل", 50 + colW, rowY, { width: colW })
      .text("Year / السنة", 50 + colW * 2, rowY, { width: colW });

    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`${carInfo.makeAr} (${carInfo.make})`, 50, rowY + 14, { width: colW })
      .text(`${carInfo.modelAr} (${carInfo.model})`, 50 + colW, rowY + 14, { width: colW })
      .text(carInfo.year, 50 + colW * 2, rowY + 14, { width: colW });

    doc.moveDown(2.5);

    // ── Damage photo ──────────────────────────────────────────────────────────
    if (imageBuffer) {
      const imgSectionY = doc.y;
      doc.rect(50, imgSectionY, pageWidth, 28).fill(light);
      doc
        .fillColor(blue)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Damage Photo / صورة الضرر", 55, imgSectionY + 8, {
          width: pageWidth - 10,
          align: "left",
        });

      doc.moveDown(0.5);

      const maxImgWidth = pageWidth;
      const maxImgHeight = 220;

      try {
        doc.image(imageBuffer, 50, doc.y, {
          fit: [maxImgWidth, maxImgHeight],
          align: "center",
          valign: "center",
        });
        doc.moveDown(0.5);
        // Move cursor past the image
        const imgY = doc.y;
        if (imgY < imgSectionY + 28 + maxImgHeight + 10) {
          doc.y = imgSectionY + 28 + maxImgHeight + 10;
        }
      } catch (imgErr: any) {
        console.warn(`[analysisPdf] Could not embed image: ${imgErr?.message}`);
        doc
          .fillColor(gray)
          .font("Helvetica")
          .fontSize(10)
          .text("[Photo could not be embedded]", 50, doc.y, { width: pageWidth, align: "center" });
        doc.moveDown(1);
      }
    }

    doc.moveDown(0.5);

    // ── Parts table ───────────────────────────────────────────────────────────
    const tableY = doc.y;

    if (tableY > doc.page.height - 150) {
      doc.addPage();
    }

    const tableActualY = doc.y;
    doc.rect(50, tableActualY, pageWidth, 28).fill(blue);

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Detected Parts / القطع المكتشفة", 55, tableActualY + 8, {
        width: pageWidth - 10,
        align: "left",
      });

    const col1 = 50;
    const col2 = 50 + pageWidth * 0.42;
    const col3 = 50 + pageWidth * 0.67;
    const col4 = 50 + pageWidth * 0.82;

    let rowTop = tableActualY + 28 + 6;

    doc
      .fillColor(gray)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Arabic Name / الاسم", col1, rowTop, { width: pageWidth * 0.40 })
      .text("English Name", col2, rowTop, { width: pageWidth * 0.23 })
      .text("Confidence", col3, rowTop, { width: pageWidth * 0.14 })
      .text("Est. Price (SAR)", col4, rowTop, { width: pageWidth * 0.18 });

    rowTop += 18;
    doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop).strokeColor("#E5E7EB").lineWidth(0.5).stroke();

    parts.forEach((part, i) => {
      if (rowTop > doc.page.height - 100) {
        doc.addPage();
        rowTop = 60;
      }

      if (i % 2 === 0) {
        doc.rect(50, rowTop, pageWidth, 22).fill(light);
      }

      const conf = part.confidence;
      const confColor = conf >= 90 ? "#16A34A" : conf >= 75 ? "#22C55E" : conf >= 60 ? "#D97706" : "#DC2626";

      doc
        .fillColor(dark)
        .font("Helvetica")
        .fontSize(9)
        .text(part.nameAr, col1 + 2, rowTop + 6, { width: pageWidth * 0.40 })
        .text(part.name, col2, rowTop + 6, { width: pageWidth * 0.23 })
        .fillColor(confColor)
        .text(`${conf}%`, col3, rowTop + 6, { width: pageWidth * 0.14 })
        .fillColor(dark)
        .text(`${part.price.toLocaleString()} SAR`, col4, rowTop + 6, { width: pageWidth * 0.18 });

      rowTop += 22;
      doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop).strokeColor("#E5E7EB").lineWidth(0.3).stroke();
    });

    // ── Total ─────────────────────────────────────────────────────────────────
    const total = parts.reduce((sum, p) => sum + p.price, 0);

    doc.y = rowTop + 8;
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(blue).lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(
        `Total Estimated Price / الإجمالي التقديري: ${total.toLocaleString()} SAR`,
        50,
        doc.y,
        { width: pageWidth, align: "right" }
      );

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc
      .fillColor(gray)
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Generated by Laqit — لاقط | laqit.app — All prices are estimates only.",
        50,
        footerY,
        { width: pageWidth, align: "center" }
      );

    doc.end();
  });
}
