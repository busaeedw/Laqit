---
name: Inspection PDF must route through one helper
description: Why all inspection PDF endpoints must call buildInspectionPdfBuffer instead of mapping parts inline
---

All customer-facing inspection PDF generation must go through the single
`buildInspectionPdfBuffer` helper in `server/routes.ts`. Do not reintroduce
inline `parts -> partEntries` mapping inside individual endpoints.

**Why:** Inspection parts are stored Arabic-only (`inspection_parts.partName`,
no English column, no confidence/price). Producing a correct English PDF
requires translating the Arabic names (OpenAI via `translatePartNames`) and
applying consistent locale validation. Three endpoints (GET `.../:id/pdf` for
preview/download, POST `.../:id/send-pdf` email, POST `.../:id/whatsapp-pdf`)
each had near-identical inline mapping that set `name = nameAr = partName` with
no translation. When the translation fix was added to only the shared helper,
the GET endpoint (the path the app's preview/download actually uses) still
showed Arabic under English headers — the user-visible bug persisted across two
fix attempts because the wrong copy was edited.

**How to apply:** Any new or changed inspection PDF endpoint should fetch +
ownership-check the inspection, then delegate buffer creation to
`buildInspectionPdfBuffer(inspection, locale)`. Keep the vendor RFQ flow
hardcoded to Arabic (vendors get Arabic) — that one is intentionally separate.
Note: confidence ("1%") and price ("0 SAR") in inspection PDFs are hardcoded
placeholders because that data isn't stored per inspection part.
