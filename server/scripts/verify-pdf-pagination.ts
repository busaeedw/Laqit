import { generateAnalysisPdf } from "../services/analysisPdf";
import * as fs from "fs";
import * as path from "path";

const carInfo = {
  make: "Toyota",
  makeAr: "تويوتا",
  model: "Camry",
  modelAr: "كامري",
  year: "2022",
};

const makeParts = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `part-${i}`,
    name: `Spare Part ${i + 1}`,
    nameAr: `قطعة غيار رقم ${i + 1}`,
    confidence: 85 + (i % 15),
    price: 150 + i * 25,
  }));

function countPages(buf: Buffer): number {
  const text = buf.toString("binary");
  const matches = text.match(/\/Type\s*\/Page[^s]/g) ?? [];
  return matches.length;
}

async function runTest(
  label: string,
  locale: "ar" | "en",
  partCount: number,
  minPages: number
) {
  process.stdout.write(`  ${label} (${partCount} parts, locale=${locale}) ... `);
  const parts = makeParts(partCount);
  const buf = await generateAnalysisPdf(carInfo, parts, undefined, locale);
  const pages = countPages(buf);

  if (buf.length < 1000) {
    console.log(`FAIL — buffer too small (${buf.length} bytes)`);
    return false;
  }
  if (pages < minPages) {
    console.log(`FAIL — expected ≥${minPages} pages, got ${pages}`);
    return false;
  }
  console.log(`PASS (${pages} page${pages !== 1 ? "s" : ""}, ${buf.length} bytes)`);
  return { buf, pages };
}

async function main() {
  console.log("\nPDF pagination verification\n");

  const outDir = path.resolve(process.cwd(), "server/scripts/out");
  fs.mkdirSync(outDir, { recursive: true });

  let allPassed = true;

  const cases: Array<{ label: string; locale: "ar" | "en"; count: number; minPages: number; filename: string }> = [
    { label: "Arabic-only   ", locale: "ar", count: 50, minPages: 2, filename: "pagination-ar.pdf" },
    { label: "English-only  ", locale: "en", count: 50, minPages: 2, filename: "pagination-en.pdf" },
    { label: "Single page   ", locale: "ar", count: 5,  minPages: 1, filename: "single-page-ar.pdf" },
  ];

  for (const tc of cases) {
    const result = await runTest(tc.label, tc.locale, tc.count, tc.minPages);
    if (result === false) {
      allPassed = false;
    } else {
      fs.writeFileSync(path.join(outDir, tc.filename), result.buf);
    }
  }

  console.log("\nOutput PDFs written to server/scripts/out/ for visual inspection.");

  if (!allPassed) {
    console.error("\nSome tests FAILED.\n");
    process.exit(1);
  }
  console.log("\nAll tests PASSED.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err?.message ?? err);
  process.exit(1);
});
