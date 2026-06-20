import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { createHmac, timingSafeEqual } from "crypto";
import OpenAI from "openai";
import { db } from "./db";
import { signToken, requireCustomer, optionalCustomer, requireAdmin, issueOtp, verifyOtp, hasPendingOtp, otpIpLimiter, aiCustomerLimiter, aiIpLimiter, emailIpLimiter } from "./auth";
import {
  users,
  inspections,
  cities,
  carMakes,
  carModels,
  carMakeAgents,
  customers,
  vendors,
  vendorUsers,
  vendorLocations,
  vendorSupportedModels,
  laqitInspections,
  inspectionMedia,
  inspectionParts,
  rfqDocuments,
  rfqRecipients,
  whatsappMessages,
  quotes,
  payments,
  notifications,
  inspectionStatusEnum,
} from "../shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { sendWhatsAppMessage, sendWhatsAppDocument } from "./services/whatsapp";
import { sendSms } from "./services/sms";
import { extractTotalPrice } from "./services/ocr";
import { createPaymentIntent } from "./services/payment";
import { generateAnalysisPdf, PdfLocale, CarInfo, PartEntry } from "./services/analysisPdf";
import { translatePartNames } from "./services/translate";
import { sendAnalysisPdfEmail } from "./services/email";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function clientIp(req: Request): string {
  // req.ip is resolved by Express using the trust-proxy setting configured
  // in server/index.ts (trust proxy = 1). This strips the trusted upstream
  // hop so the returned value reflects the real client, not an attacker-
  // injected leading X-Forwarded-For entry.
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

// Mask a mobile number for confirmation messages so the full number is never
// echoed back to the client (e.g. "+9665••••307").
function maskMobile(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length <= 6) return "•".repeat(digits.length);
  const head = digits.slice(0, 4);
  const tail = digits.slice(-3);
  return `+${head}${"•".repeat(Math.max(digits.length - 7, 3))}${tail}`;
}

// Build a PDF report for an already-loaded inspection (ownership must be verified
// by the caller before invoking this). Returns the rendered buffer or a typed
// failure with the appropriate HTTP status.
async function buildInspectionPdfBuffer(
  inspection: typeof laqitInspections.$inferSelect,
  locale: unknown
): Promise<{ ok: true; pdfBuffer: Buffer } | { ok: false; status: number; error: string }> {
  const parts = await db
    .select()
    .from(inspectionParts)
    .where(eq(inspectionParts.inspectionId, inspection.inspectionId));
  if (parts.length === 0) {
    return { ok: false, status: 400, error: "لا توجد قطع مرتبطة بهذا الفحص" };
  }

  const [carModel] = await db
    .select()
    .from(carModels)
    .where(eq(carModels.carModelId, inspection.carModelId))
    .limit(1);

  const makeName = carModel
    ? await db
        .select({ makeName: carMakes.makeName, nameAr: carMakes.nameAr })
        .from(carMakes)
        .where(eq(carMakes.makeId, carModel.makeId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const mediaRows = await db
    .select()
    .from(inspectionMedia)
    .where(eq(inspectionMedia.inspectionId, inspection.inspectionId));
  const damagePhoto = mediaRows.find((m) => m.mediaType === "damage_photo") ?? mediaRows[0] ?? null;
  const safeImageUri =
    damagePhoto?.fileUrl &&
    typeof damagePhoto.fileUrl === "string" &&
    damagePhoto.fileUrl.startsWith("https://")
      ? damagePhoto.fileUrl
      : undefined;

  const carInfo = {
    make: makeName?.makeName ?? "",
    makeAr: makeName?.nameAr ?? makeName?.makeName ?? "",
    model: carModel?.modelName ?? "",
    modelAr: carModel?.modelName ?? "",
    year: inspection.carYear ? String(inspection.carYear) : "",
  };

  const VALID_LOCALES: PdfLocale[] = ["ar", "en"];
  const safeLocale: PdfLocale = VALID_LOCALES.includes(locale as PdfLocale) ? (locale as PdfLocale) : "ar";

  // Inspection parts are stored in Arabic only. For an English report, translate
  // the Arabic labels into English so the PDF doesn't show Arabic text under
  // English headers. Falls back to the Arabic name if translation fails.
  const englishNames =
    safeLocale === "en"
      ? await translatePartNames(parts.map((p) => p.partName))
      : parts.map((p) => p.partName);

  const partEntries = parts.map((p, i) => ({
    id: p.inspectionPartId,
    name: englishNames[i] ?? p.partName,
    nameAr: p.partName,
    confidence: 1,
    price: 0,
  }));

  const pdfBuffer = await generateAnalysisPdf(carInfo, partEntries, safeImageUri, safeLocale);
  return { ok: true, pdfBuffer };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // User Registration
  app.post("/api/register", async (req, res) => {
    try {
      const { name, mobile, email } = req.body;

      if (!name || !mobile) {
        return res.status(400).json({ error: "الاسم ورقم الجوال مطلوبان" });
      }

      // Check if mobile already exists
      const existingUser = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "رقم الجوال مسجل مسبقاً" });
      }

      const [newUser] = await db.insert(users).values({
        name,
        mobile,
        email: email || null,
      }).returning();

      res.json({ success: true, user: { id: newUser.id, name: newUser.name, mobile: newUser.mobile, email: newUser.email } });
    } catch (error: any) {
      console.error("Registration error:", error?.message);
      res.status(500).json({ error: "حدث خطأ أثناء التسجيل" });
    }
  });

  // Legacy login endpoint removed — authenticated only by name+mobile (no credential proof).
  // Use POST /api/customers/login instead.
  app.post("/api/login", (_req, res) => {
    res.status(410).json({ error: "هذه الخدمة لم تعد متاحة" });
  });

  // Legacy inspection endpoints removed — no authentication or ownership checks.
  // Use POST /api/laqit-inspections and GET /api/laqit-inspections/customer/:customerId instead.
  app.post("/api/inspections", (_req, res) => {
    res.status(410).json({ error: "هذه الخدمة لم تعد متاحة" });
  });

  app.get("/api/inspections/:userId", (_req, res) => {
    res.status(410).json({ error: "هذه الخدمة لم تعد متاحة" });
  });


  app.post("/api/analyze", optionalCustomer, async (req, res) => {
    try {
      const customerId = res.locals.customerId as string | undefined;
      if (customerId && !aiCustomerLimiter.check(customerId)) {
        const retryAfter = aiCustomerLimiter.retryAfterSeconds(customerId);
        return res.status(429).json({ error: `تجاوزت الحد المسموح من طلبات التحليل، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }
      const ip = clientIp(req);
      if (!aiIpLimiter.check(ip)) {
        const retryAfter = aiIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { imageUri, carInfo } = req.body;

      if (!imageUri || typeof imageUri !== "string") {
        return res.status(400).json({
          error: true,
          message: "الصورة مطلوبة لتحليل الأضرار",
          carInfo: {
            make: "Unknown",
            makeAr: "غير معروف",
            model: "Unknown",
            modelAr: "غير معروف",
            year: "---",
          },
          parts: [],
        });
      }

      console.log("Received analyze request");

      const systemPrompt = `You are an expert automotive damage and missing parts detection system. You MUST analyze the image and identify the car, then detect any missing, damaged, broken, or worn parts.

IMPORTANT: You MUST ALWAYS return valid JSON in the exact format specified below. NEVER return error messages or plain text.

STEP 1 - Identify the car:
- Look for visible text on the car (brand names like "ODYSSEY", "FLEX", "CAMRY", etc.)
- Look for brand logos/emblems (Honda "H", Ford oval, Toyota logo, etc.)
- Study the body shape, taillights, and distinctive features
- Estimate the year based on the generation/design

STEP 2 - Systematically inspect for VISIBLE EXTERNAL damage (scan EVERY zone):
This is a damage inspection tool; missing real damage is the worst possible outcome. Work zone by zone and report EVERY visible defect as its own separate part entry:
- FRONT: bumper, grille, headlights, fog lights, hood, emblem, license plate area
- REAR: bumper, tail lights, trunk/tailgate, exhaust tip, emblem
- SIDES: front/rear doors, fenders, side mirrors, door handles, side moldings/trim, rocker panels
- GLASS: windshield, rear window, side windows (look for chips, cracks, shattering)
- WHEELS & TIRES: rims (scuffs, bends, curb rash), tires (wear, flats, sidewall cuts)
- LIGHTS: any cracked, broken, fogged, hazed, or missing lamp/lens
- PAINT & BODY: scratches, scuffs, dents, dings, rust, faded/peeling/chipped paint, paint transfer, misaligned panels or uneven gaps

For EACH defect, create a SEPARATE entry. Report damage even when minor. Each external part entry must include:
- "category": "external"
- "inferred": false

STEP 3 - Infer LIKELY INTERNAL damage:
Based on the visible external damage you found, infer what INTERNAL components are likely also affected. For example:
- Front bumper impact → likely radiator, condenser, fan, or headlight mounts damage
- Door dent / side impact → likely inner door panel, window regulator, or side airbag damage
- Hood damage → likely hood latch, hinges, or insulation damage
- Rear bumper damage → likely parking sensors, wiring harness, or trunk latch damage
- Major front-end damage → likely frame, engine mounts, or wiring harness damage

For EACH likely internal part, create a separate entry with:
- "category": "internal"
- "inferred": true
- "confidence": 40-70 (lower than direct observations because they are inferred)
- "price": realistic replacement/repair estimate in SAR
- "name": "Internal: Component Name - Inferred Damage"
- "nameAr": "داخلي: اسم القطعة - ضرر متوقع"
- "description": Explain WHY this internal part is likely damaged based on the visible external damage
- "descriptionAr": Arabic explanation

You MUST return this exact JSON structure (no exceptions):
{
  "carInfo": {
    "make": "Honda",
    "makeAr": "هوندا",
    "model": "Odyssey",
    "modelAr": "أوديسي",
    "year": "2022"
  },
  "parts": [
    {
      "id": "1",
      "name": "Front Bumper - Damaged",
      "nameAr": "الصدام الأمامي - تالف",
      "description": "Front bumper has visible crack on the left side",
      "descriptionAr": "الصدام الأمامي به شرخ واضح على الجانب الأيسر",
      "condition": "damaged",
      "conditionAr": "تالف",
      "primaryUse": "Protects the front of the vehicle in low-speed collisions",
      "primaryUseAr": "حماية مقدمة السيارة في التصادمات منخفضة السرعة",
      "price": 1200,
      "confidence": 85,
      "boundingBox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2 },
      "category": "external",
      "inferred": false
    },
    {
      "id": "2",
      "name": "Internal: Radiator - Inferred Damage",
      "nameAr": "داخلي: المبرد - ضرر متوقع",
      "description": "Front bumper impact likely damaged the radiator behind it",
      "descriptionAr": "تصادم الصدام الأمامي قد أثر على المبرد خلفه",
      "condition": "likely damaged",
      "conditionAr": "من المحتمل تالف",
      "primaryUse": "Cools the engine coolant",
      "primaryUseAr": "تبريد سائل المحرك",
      "price": 800,
      "confidence": 55,
      "boundingBox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2 },
      "category": "internal",
      "inferred": true
    }
  ]
}

CONDITION VALUES:
- "missing" / "مفقود" - Part is completely absent
- "damaged" / "تالف" - Part is broken, cracked, or significantly damaged  
- "scratched" / "مخدوش" - Part has scratches or surface damage
- "dented" / "مضغوط" - Part has dents
- "worn" / "متآكل" - Part shows significant wear
- "faded" / "باهت" - Paint or surface has faded
- "cracked" / "متشقق" - Part has cracks

RULES:
- Be thorough: report EVERY visible defect as its own part entry. Err on the side of reporting borderline or minor damage rather than missing it.
- Examine the whole image methodically; do not stop after finding one issue. A single photo often shows several separate damaged parts.
- Only return an empty parts array if the image clearly shows an undamaged car in pristine condition, or if there is genuinely no car in the image.
- If the image is blurry or a region is partly unclear, still report what is visibly wrong and lower the confidence accordingly instead of skipping it.
- boundingBox must tightly frame the damaged area using normalized 0-1 coordinates (x,y = top-left corner; width,height = size). Provide one for every part.
- ALWAYS provide Arabic translations (makeAr, modelAr, nameAr, descriptionAr, conditionAr, primaryUseAr)
- Confidence should reflect how certain you are about the damage (60-100)
- Prices should be realistic replacement/repair estimates in SAR
- NEVER return an error message - always return the JSON structure above`;

      const userMessage = carInfo
        ? `The user has selected: ${carInfo.make} ${carInfo.model} ${carInfo.year}. Inspect the car image carefully for any missing, damaged, broken, worn, or defective parts.`
        : `Identify the car make, model, year, then inspect the image carefully for any missing, damaged, broken, worn, or defective parts.`;

      console.log("Calling OpenAI API with model gpt-5...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              {
                type: "image_url",
                image_url: { url: imageUri, detail: "high" },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        max_completion_tokens: 16384,
      });

      const finishReason = response.choices[0]?.finish_reason;
      console.log(`OpenAI API response received (finish_reason=${finishReason})`);

      const content = response.choices[0]?.message?.content?.trim() || "";

      if (finishReason === "length" || !content) {
        console.warn(
          `Analyze response unusable (finish_reason=${finishReason}, contentLength=${content.length})`
        );
        return res.status(502).json({
          error: true,
          message: "تعذر إكمال تحليل الصورة، يرجى المحاولة مرة أخرى",
          carInfo: {
            make: "Unknown",
            makeAr: "غير معروف",
            model: "Unknown",
            modelAr: "غير معروف",
            year: "---",
          },
          parts: [],
        });
      }

      let result: any;
      try {
        result = JSON.parse(content);
      } catch (parseErr) {
        console.warn("Analyze response was not valid JSON");
        return res.status(502).json({
          error: true,
          message: "تعذر قراءة نتيجة التحليل، يرجى المحاولة مرة أخرى",
          carInfo: {
            make: "Unknown",
            makeAr: "غير معروف",
            model: "Unknown",
            modelAr: "غير معروف",
            year: "---",
          },
          parts: [],
        });
      }

      // Validate the response has the expected structure
      if (!result.carInfo || !Array.isArray(result.parts)) {
        console.warn("Analyze response had invalid structure");
        return res.status(502).json({
          error: true,
          message: "تعذر تحليل الصورة بشكل صحيح، يرجى المحاولة مرة أخرى",
          carInfo: {
            make: "Unknown",
            makeAr: "غير معروف",
            model: "Unknown",
            modelAr: "غير معروف",
            year: "---",
          },
          parts: [],
        });
      }

      console.log(`Analyze success: ${result.parts.length} part(s) detected`);
      res.json(result);
    } catch (error: any) {
      console.error("Analysis error details:", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
      });
      
      res.status(500).json({
        error: true,
        message: "فشل في تحليل الصورة. يرجى المحاولة مرة أخرى.",
        carInfo: {
          make: "Unknown",
          makeAr: "غير معروف",
          model: "Unknown",
          modelAr: "غير معروف",
          year: "---",
        },
        parts: [],
      });
    }
  });

  // ─── Car Identification by Photo ─────────────────────────────────────────

  app.post("/api/identify-car", optionalCustomer, async (req, res) => {
    try {
      const customerId = res.locals.customerId as string | undefined;
      if (customerId && !aiCustomerLimiter.check(customerId)) {
        const retryAfter = aiCustomerLimiter.retryAfterSeconds(customerId);
        return res.status(429).json({ error: `تجاوزت الحد المسموح من طلبات التحليل، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }
      const ip = clientIp(req);
      if (!aiIpLimiter.check(ip)) {
        const retryAfter = aiIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { imageUri } = req.body;
      if (!imageUri) return res.status(400).json({ error: "imageUri required" });

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an automotive expert. Analyze the car in the image and identify its make, model, and year. Return ONLY valid JSON in this exact format:
{
  "makeName": "Toyota",
  "modelName": "Camry",
  "year": "2022",
  "confidence": 85
}
Rules:
- makeName: the manufacturer brand name in English (e.g. Toyota, Hyundai, Nissan, Ford, GMC, Kia, Honda, BMW)
- modelName: the model name in English (e.g. Camry, Corolla, Accent)
- year: 4-digit year as a string, estimate if not certain
- confidence: integer 0-100 reflecting certainty
- If the image has no car, return { "makeName": null, "modelName": null, "year": null, "confidence": 0 }`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify the make, model, and year of this car." },
              { type: "image_url", image_url: { url: imageUri } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(raw);
      res.json(result);
    } catch (err: any) {
      console.error("identify-car error:", err?.message);
      res.status(500).json({ error: "فشل في تحليل صورة السيارة" });
    }
  });

  // ─── Analysis PDF Email ───────────────────────────────────────────────────

  app.post("/api/analysis/send-pdf", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!emailIpLimiter.check(ip)) {
        const retryAfter = emailIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { email, carInfo, parts, imageUri, locale } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صحيح" });
      }

      if (!carInfo || !Array.isArray(parts)) {
        return res.status(400).json({ error: "بيانات التقرير غير مكتملة" });
      }

      const safeImageUri = typeof imageUri === "string" && imageUri.startsWith("https://") ? imageUri : undefined;
      const VALID_LOCALES: PdfLocale[] = ["ar", "en"];
      const safeLocale: PdfLocale = VALID_LOCALES.includes(locale) ? (locale as PdfLocale) : "ar";
      const pdfBuffer = await generateAnalysisPdf(carInfo, parts, safeImageUri, safeLocale);
      const filename = `laqit-analysis-${Date.now()}.pdf`;
      const result = await sendAnalysisPdfEmail(email, pdfBuffer, filename);

      if (!result.success) {
        return res.status(500).json({ error: "فشل في إرسال البريد الإلكتروني، يرجى المحاولة لاحقاً" });
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error("send-pdf error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء أو إرسال التقرير" });
    }
  });

  // ─── Analysis PDF Download (returns raw PDF bytes) ───────────────────────

  app.post("/api/analysis/download-pdf", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!emailIpLimiter.check(ip)) {
        const retryAfter = emailIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { carInfo, parts, imageUri, locale } = req.body;

      if (!carInfo || !Array.isArray(parts)) {
        return res.status(400).json({ error: "بيانات التقرير غير مكتملة" });
      }

      const safeImageUri = typeof imageUri === "string" && imageUri.startsWith("https://") ? imageUri : undefined;
      const safeLocale = ["ar", "en"].includes(locale) ? locale : "ar";
      const pdfBuffer = await generateAnalysisPdf(carInfo, parts, safeImageUri, safeLocale);
      const filename = `laqit-analysis-${Date.now()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("download-pdf error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء التقرير" });
    }
  });

  // ─── Analysis PDF via WhatsApp (sends to the logged-in customer's mobile) ──
  // The recipient is derived server-side from the authenticated customer so the
  // outbound WhatsApp capability cannot be abused to message arbitrary numbers.

  app.post("/api/analysis/whatsapp-pdf", requireCustomer, async (req: Request, res: Response) => {
    try {
      const ip = clientIp(req);
      if (!emailIpLimiter.check(ip)) {
        const retryAfter = emailIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { carInfo, parts, imageUri, locale } = req.body;
      if (!carInfo || !Array.isArray(parts)) {
        return res.status(400).json({ error: "بيانات التقرير غير مكتملة" });
      }

      const callerCustomerId: string = res.locals.customerId;
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, callerCustomerId))
        .limit(1);
      if (!customer?.mobileE164) {
        return res.status(400).json({ error: "لا يوجد رقم جوال مرتبط بحسابك" });
      }

      const safeImageUri = typeof imageUri === "string" && imageUri.startsWith("https://") ? imageUri : undefined;
      const VALID_LOCALES: PdfLocale[] = ["ar", "en"];
      const safeLocale: PdfLocale = VALID_LOCALES.includes(locale) ? (locale as PdfLocale) : "ar";
      const pdfBuffer = await generateAnalysisPdf(carInfo, parts, safeImageUri, safeLocale);
      const filename = `laqit-analysis-${Date.now()}.pdf`;
      const caption = "لاقط: تقرير تحليل الأضرار";

      const result = await sendWhatsAppDocument(customer.mobileE164, pdfBuffer, filename, caption);
      if (!result.success) {
        return res.status(502).json({ error: "تعذّر إرسال التقرير عبر واتساب، يرجى المحاولة لاحقاً" });
      }
      res.json({ ok: true, sentTo: maskMobile(customer.mobileE164) });
    } catch (err: any) {
      console.error("analysis whatsapp-pdf error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء أو إرسال التقرير" });
    }
  });

  // ─── Reference Data ──────────────────────────────────────────────────────

  app.get("/api/cities", async (_req, res) => {
    try {
      const result = await db.select().from(cities).orderBy(cities.nameAr);
      res.json({ cities: result });
    } catch (err: any) {
      console.error("GET /api/cities error:", err?.message);
      res.status(500).json({ error: "خطأ في جلب المدن" });
    }
  });

  const STATIC_AGENTS: Record<string, { agentNameEn: string; agentNameAr: string; website: string; phone: string; headquartersCity: string }> = {
    "Toyota":        { agentNameEn: "Abdul Latif Jameel Motors",        agentNameAr: "عبد اللطيف جميل للسيارات",      website: "toyota.com.sa",            phone: "920000655",  headquartersCity: "Jeddah" },
    "Lexus":         { agentNameEn: "Abdul Latif Jameel Motors",        agentNameAr: "عبد اللطيف جميل للسيارات",      website: "lexus-alj.com",            phone: "920000655",  headquartersCity: "Jeddah" },
    "JETOUR":        { agentNameEn: "Abdul Latif Jameel Motors",        agentNameAr: "عبد اللطيف جميل للسيارات",      website: "jetour-ksa.com",           phone: "920000655",  headquartersCity: "Jeddah" },
    "Honda":         { agentNameEn: "Abdullah Hashim Company",          agentNameAr: "شركة عبدالله هاشم",             website: "hondasaudi.com",           phone: "920002208",  headquartersCity: "Jeddah" },
    "Nissan":        { agentNameEn: "E.A. Juffali & Brothers",          agentNameAr: "إ.أ. جفالي وإخوانه",            website: "nissan.com.sa",            phone: "920001666",  headquartersCity: "Riyadh" },
    "Infiniti":      { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",           phone: "920002100",  headquartersCity: "Riyadh" },
    "Mercedes-Benz": { agentNameEn: "SAMACO Automotive",                agentNameAr: "سامكو للسيارات",                website: "mercedes-benz-arabia.com", phone: "920000724",  headquartersCity: "Riyadh" },
    "BMW":           { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "bmwksa.com",               phone: "920003040",  headquartersCity: "Jeddah" },
    "Hyundai":       { agentNameEn: "Olayan Financing Company",         agentNameAr: "شركة أوليان للتمويل",           website: "hyundai.com.sa",           phone: "920001234",  headquartersCity: "Riyadh" },
    "Genesis":       { agentNameEn: "Almajdouie Motors",                agentNameAr: "المجدوعي للسيارات",             website: "genesis.com/sa",           phone: "920001000",  headquartersCity: "Dammam" },
    "Kia":           { agentNameEn: "Al Jabr Trading & NMC",            agentNameAr: "الجابر للتجارة",                website: "kia.com.sa",               phone: "920001522",  headquartersCity: "Riyadh" },
    "Renault":       { agentNameEn: "Wallan Trading Company",           agentNameAr: "شركة وعلان للتجارة",            website: "renault.sa",               phone: "920000525",  headquartersCity: "Jeddah" },
    "Geely":         { agentNameEn: "Wallan Trading Company",           agentNameAr: "شركة وعلان للتجارة",            website: "geely.com.sa",             phone: "920000525",  headquartersCity: "Jeddah" },
    "Ford":          { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    "Lincoln":       { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    "Chevrolet":     { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    "GMC":           { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    "Cadillac":      { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    "Land Rover":    { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    "Volvo":         { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    "Chery":         { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "chery-saudi.com",          phone: "920003040",  headquartersCity: "Jeddah" },
    "Exeed":         { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "exeed-saudi.com",          phone: "920003040",  headquartersCity: "Jeddah" },
    "Haval":         { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "haval-saudi.com",          phone: "920003040",  headquartersCity: "Jeddah" },
    "Subaru":        { agentNameEn: "Mohamed Yousuf Naghi Motors",      agentNameAr: "محمد يوسف ناغي للسيارات",       website: "subaru-saudi.com",         phone: "920003040",  headquartersCity: "Jeddah" },
    "Audi":          { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",           phone: "920002100",  headquartersCity: "Riyadh" },
    "Volkswagen":    { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",           phone: "920002100",  headquartersCity: "Riyadh" },
    "Porsche":       { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",           phone: "920002100",  headquartersCity: "Riyadh" },
    "Jeep":          { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",           phone: "920002100",  headquartersCity: "Riyadh" },
    "Dodge":         { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",           phone: "920002100",  headquartersCity: "Riyadh" },
    "RAM":           { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",           phone: "920002100",  headquartersCity: "Riyadh" },
    "Mitsubishi":    { agentNameEn: "Algosaibi Motors",                 agentNameAr: "شركة الغصيبي للسيارات",         website: "algosaibi-motors.com",     phone: "920002202",  headquartersCity: "Riyadh" },
    "MG":            { agentNameEn: "SAMACO Automotive",                agentNameAr: "سامكو للسيارات",                website: "samaco.com.sa",            phone: "920000724",  headquartersCity: "Riyadh" },
    "Mazda":         { agentNameEn: "Al Jazirah Vehicles Agencies",     agentNameAr: "الجزيرة للسيارات",              website: "mazda.sa",                 phone: "920002100",  headquartersCity: "Riyadh" },
    "Suzuki":        { agentNameEn: "National Auto Company",            agentNameAr: "الشركة الوطنية للسيارات",       website: "suzuki.sa",                phone: "920001900",  headquartersCity: "Riyadh" },
    "BYD":           { agentNameEn: "Al-Futtaim Electric Mobility",     agentNameAr: "الفطيم للتنقل الكهربائي",       website: "byd.sa",                   phone: "8003020006", headquartersCity: "Riyadh" },
    "Changan":       { agentNameEn: "Almajdouie Motors",                agentNameAr: "المجدوعي للسيارات",             website: "changanauto.com.sa",       phone: "920001000",  headquartersCity: "Dammam" },
    "GAC":           { agentNameEn: "Aljomaih Automotive",              agentNameAr: "الجميح للسيارات",               website: "gac-motor.com.sa",         phone: "920001199",  headquartersCity: "Riyadh" },
    "Isuzu":         { agentNameEn: "Xenel Industries / Isuzu Arabia",  agentNameAr: "زينيل / إيسوزو العربية",        website: "isuzuarabia.com",          phone: "920002255",  headquartersCity: "Riyadh" },
  };

  app.get("/api/car-makes", async (_req, res) => {
    try {
      const rows = await db
        .select({
          makeId: carMakes.makeId,
          makeName: carMakes.makeName,
          nameAr: carMakes.nameAr,
          createdAt: carMakes.createdAt,
          agentNameEn: carMakeAgents.agentNameEn,
          agentNameAr: carMakeAgents.agentNameAr,
          website: carMakeAgents.website,
          phone: carMakeAgents.phone,
          headquartersCity: carMakeAgents.headquartersCity,
        })
        .from(carMakes)
        .leftJoin(carMakeAgents, eq(carMakeAgents.makeId, carMakes.makeId))
        .orderBy(carMakes.makeName);

      const makes = rows.map((r) => {
        const dbAgent = r.agentNameEn
          ? { agentNameEn: r.agentNameEn, agentNameAr: r.agentNameAr, website: r.website, phone: r.phone, headquartersCity: r.headquartersCity }
          : null;
        const staticAgent = STATIC_AGENTS[r.makeName] ?? null;
        return {
          makeId: r.makeId,
          makeName: r.makeName,
          nameAr: r.nameAr,
          createdAt: r.createdAt,
          agent: dbAgent ?? staticAgent,
        };
      });

      res.json({ makes });
    } catch (err: any) {
      console.error("GET /api/car-makes error:", err?.message);
      res.status(500).json({ error: "خطأ في جلب الماركات" });
    }
  });

  app.patch("/api/car-makes/:makeId/agent", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { makeId } = req.params;
      const { agentNameEn, agentNameAr, website, phone, headquartersCity } = req.body;
      if (!agentNameEn) {
        return res.status(400).json({ error: "agentNameEn is required" });
      }
      const [agent] = await db
        .insert(carMakeAgents)
        .values({ makeId, agentNameEn, agentNameAr: agentNameAr || null, website: website || null, phone: phone || null, headquartersCity: headquartersCity || null })
        .onConflictDoUpdate({
          target: carMakeAgents.makeId,
          set: {
            agentNameEn,
            agentNameAr: agentNameAr || null,
            website: website || null,
            phone: phone || null,
            headquartersCity: headquartersCity || null,
          },
        })
        .returning();
      res.json({ success: true, agent });
    } catch (err: any) {
      console.error("PATCH /api/car-makes/:makeId/agent error:", err?.message);
      res.status(500).json({ error: err?.message });
    }
  });

  app.get("/api/car-models/counts", async (_req, res) => {
    try {
      const result = await db.select().from(carModels);
      res.json({ models: result.map((m) => ({ makeId: m.makeId })) });
    } catch (err: any) {
      console.error("GET /api/car-models/counts error:", err?.message);
      res.status(500).json({ error: "خطأ في جلب عدد الموديلات" });
    }
  });

  app.get("/api/car-models/:makeId", async (req, res) => {
    try {
      const { makeId } = req.params;
      const result = await db
        .select()
        .from(carModels)
        .where(eq(carModels.makeId, makeId))
        .orderBy(carModels.modelName);
      res.json({ models: result });
    } catch (err: any) {
      console.error("GET /api/car-models error:", err?.message);
      res.status(500).json({ error: "خطأ في جلب الموديلات" });
    }
  });

  // ─── Customers ────────────────────────────────────────────────────────────

  app.post("/api/customers/register", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!otpIpLimiter.check(ip)) {
        const retryAfter = otpIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { fullName, mobileE164, email, cityId } = req.body;
      if (!mobileE164 || !email || !cityId) {
        return res.status(400).json({ error: "رقم الجوال والبريد والمدينة مطلوبة" });
      }

      // Reject if a verified account already exists for this mobile or email.
      const [existingMobile] = await db
        .select({ customerId: customers.customerId })
        .from(customers)
        .where(eq(customers.mobileE164, mobileE164))
        .limit(1);
      if (existingMobile) {
        return res.status(400).json({ error: "رقم الجوال مسجل مسبقاً" });
      }
      const [existingEmail] = await db
        .select({ customerId: customers.customerId })
        .from(customers)
        .where(eq(customers.email, email))
        .limit(1);
      if (existingEmail) {
        return res.status(400).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
      }

      // OTP is frozen for registration: create the account directly and return a
      // session token, without sending or verifying a verification code.
      let customer;
      try {
        [customer] = await db
          .insert(customers)
          .values({
            fullName: fullName ?? null,
            mobileE164,
            email,
            cityId,
            lastLoginAt: new Date(),
          })
          .returning();
      } catch (insertErr: any) {
        if (insertErr?.code === "23505") {
          return res.status(400).json({ error: "رقم الجوال أو البريد الإلكتروني مسجل مسبقاً" });
        }
        throw insertErr;
      }

      const token = signToken(customer.customerId);
      res.json({ success: true, customer, token });
    } catch (err: any) {
      console.error("Customer register error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء التسجيل" });
    }
  });

  app.post("/api/customers/login", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!otpIpLimiter.check(ip)) {
        const retryAfter = otpIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { mobileE164 } = req.body;
      if (!mobileE164) return res.status(400).json({ error: "رقم الجوال مطلوب" });

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.mobileE164, mobileE164))
        .limit(1);

      // OTP is disabled for login: an existing verified account is logged in
      // directly without a verification code.
      if (customer) {
        await db
          .update(customers)
          .set({ lastLoginAt: new Date() })
          .where(eq(customers.customerId, customer.customerId));
        const token = signToken(customer.customerId);
        return res.json({ success: true, customer, token });
      }

      // No verified account yet. Allow re-sending OTP for a pending (unverified)
      // registration so the client's resend flow works before the account has
      // been committed to the DB.
      if (!hasPendingOtp(mobileE164)) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      const result = issueOtp(mobileE164);
      if ("cooldownRemaining" in result && !("code" in result)) {
        return res.status(429).json({ error: `يرجى الانتظار ${result.cooldownRemaining} ثانية قبل طلب رمز جديد` });
      }
      const { code } = result as { code: string };
      const { sendSms } = await import("./services/sms");
      await sendSms(mobileE164, `لاقط: رمز التحقق الخاص بك هو ${code}. صالح لمدة 5 دقائق.`);
      res.json({ success: true, message: "تم إرسال رمز التحقق إلى جوالك" });
    } catch (err: any) {
      console.error("Customer login error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  app.post("/api/customers/verify-otp", async (req, res) => {
    try {
      const { mobileE164, otp, fullName, email, cityId } = req.body;
      if (!mobileE164 || !otp) return res.status(400).json({ error: "رقم الجوال ورمز التحقق مطلوبان" });

      const result = verifyOtp(mobileE164, String(otp));
      if (!result.success) {
        return res.status(400).json({ error: result.error, attemptsLeft: result.attemptsLeft });
      }

      // OTP verified — the caller is the phone owner. Determine login vs registration.
      const [existing] = await db
        .select()
        .from(customers)
        .where(eq(customers.mobileE164, mobileE164))
        .limit(1);

      let customer;

      if (!existing) {
        // Registration path: create the account now, using data provided by the
        // phone owner in this very request (after proving phone ownership).
        if (!email || !cityId) {
          return res.status(400).json({ error: "بيانات التسجيل غير مكتملة" });
        }
        try {
          [customer] = await db
            .insert(customers)
            .values({
              fullName: fullName ?? null,
              mobileE164,
              email,
              cityId,
              lastLoginAt: new Date(),
            })
            .returning();
        } catch (insertErr: any) {
          if (insertErr?.code === "23505") {
            return res.status(400).json({ error: "رقم الجوال أو البريد الإلكتروني مسجل مسبقاً" });
          }
          throw insertErr;
        }
      } else {
        // Login path: existing verified account.
        await db
          .update(customers)
          .set({ lastLoginAt: new Date() })
          .where(eq(customers.customerId, existing.customerId));
        customer = existing;
      }

      const token = signToken(customer.customerId);
      res.json({ success: true, customer, token });
    } catch (err: any) {
      console.error("Verify OTP error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء التحقق" });
    }
  });

  app.get("/api/customers/:id", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      if (req.params.id !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, req.params.id))
        .limit(1);
      if (!customer) return res.status(404).json({ error: "غير موجود" });
      res.json({ customer });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.patch("/api/customers/:id", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      if (req.params.id !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      const { fullName, cityId } = req.body;
      const [updated] = await db
        .update(customers)
        .set({ ...(fullName && { fullName }), ...(cityId && { cityId }) })
        .where(eq(customers.customerId, req.params.id))
        .returning();
      res.json({ success: true, customer: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ─── Vendors (admin / self-registration) ─────────────────────────────────

  app.get("/api/vendors", requireAdmin, async (_req, res) => {
    try {
      const result = await db.select().from(vendors).orderBy(vendors.createdAt);
      res.json({ vendors: result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/vendors", requireAdmin, async (req, res) => {
    try {
      const { vendorName, legalName, crNumber, vatNumber } = req.body;
      if (!vendorName) return res.status(400).json({ error: "اسم المورد مطلوب" });
      const [vendor] = await db
        .insert(vendors)
        .values({ vendorName, legalName, crNumber, vatNumber })
        .returning();
      res.json({ success: true, vendor });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get("/api/vendor-users", requireAdmin, async (_req, res) => {
    try {
      const result = await db.select().from(vendorUsers).orderBy(vendorUsers.createdAt);
      res.json({ vendorUsers: result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/vendor-users", requireAdmin, async (req, res) => {
    try {
      const { vendorId, fullName, mobileE164, email, whatsappE164, role } = req.body;
      if (!vendorId || !mobileE164 || !whatsappE164) {
        return res.status(400).json({ error: "معرف المورد والجوال والواتساب مطلوبة" });
      }
      const existing = await db
        .select()
        .from(vendorUsers)
        .where(and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.isWhatsappPrimary, true)))
        .limit(1);
      const isFirst = existing.length === 0;
      const [vu] = await db
        .insert(vendorUsers)
        .values({ vendorId, fullName, mobileE164, email, whatsappE164, isWhatsappPrimary: isFirst, role: role ?? "owner" })
        .returning();
      res.json({ success: true, vendorUser: vu });
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(400).json({ error: "رقم الجوال أو الواتساب مسجل مسبقاً" });
      }
      res.status(500).json({ error: err?.message });
    }
  });

  // ─── Laqit Inspections ────────────────────────────────────────────────────

  function generateInspectionNo(): string {
    const now = new Date();
    const year = now.getFullYear();
    const seq = Math.floor(100000 + Math.random() * 900000);
    return `INS-${year}-${seq}`;
  }

  app.post("/api/laqit-inspections", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const { customerId, carModelId, carYear, carType } = req.body;
      if (!customerId || !carModelId) {
        return res.status(400).json({ error: "معرف العميل والموديل مطلوبان" });
      }
      if (customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, customerId))
        .limit(1);
      if (!customer) return res.status(404).json({ error: "العميل غير موجود" });

      let inspectionNo = generateInspectionNo();
      let attempts = 0;
      while (attempts < 5) {
        const clash = await db
          .select()
          .from(laqitInspections)
          .where(eq(laqitInspections.inspectionNo, inspectionNo))
          .limit(1);
        if (clash.length === 0) break;
        inspectionNo = generateInspectionNo();
        attempts++;
      }

      const [inspection] = await db
        .insert(laqitInspections)
        .values({
          inspectionNo,
          customerId,
          cityId: customer.cityId,
          carModelId,
          carYear: carYear ? Number(carYear) : null,
          carType: carType ?? null,
          status: "draft",
        })
        .returning();

      res.json({ success: true, inspection });
    } catch (err: any) {
      console.error("Create inspection error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء الفحص" });
    }
  });

  app.get("/api/laqit-inspections/customer/:customerId", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      if (req.params.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      const rows = await db
        .select()
        .from(laqitInspections)
        .where(eq(laqitInspections.customerId, req.params.customerId))
        .orderBy(desc(laqitInspections.createdAt));

      // Enrich with car model + make names
      const uniqueModelIds = [...new Set(rows.map((r) => r.carModelId))];
      const modelRows = uniqueModelIds.length > 0
        ? await db.select().from(carModels).where(inArray(carModels.carModelId, uniqueModelIds))
        : [];
      const uniqueMakeIds = [...new Set(modelRows.map((m) => m.makeId))];
      const makeRows = uniqueMakeIds.length > 0
        ? await db.select().from(carMakes).where(inArray(carMakes.makeId, uniqueMakeIds))
        : [];

      const modelMap: Record<string, { modelName: string; makeId: string }> = {};
      modelRows.forEach((m) => { modelMap[m.carModelId] = { modelName: m.modelName, makeId: m.makeId }; });
      const makeMap: Record<string, string> = {};
      makeRows.forEach((m) => { makeMap[m.makeId] = m.makeName; });

      const enriched = rows.map((r) => ({
        ...r,
        modelName: modelMap[r.carModelId]?.modelName ?? null,
        makeName: makeMap[modelMap[r.carModelId]?.makeId ?? ""] ?? null,
      }));

      res.json({ inspections: enriched });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get("/api/laqit-inspections/:id", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const [inspection] = await db
        .select()
        .from(laqitInspections)
        .where(eq(laqitInspections.inspectionId, req.params.id))
        .limit(1);
      if (!inspection) return res.status(404).json({ error: "غير موجود" });
      if (inspection.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const media = await db
        .select()
        .from(inspectionMedia)
        .where(eq(inspectionMedia.inspectionId, req.params.id));

      const parts = await db
        .select()
        .from(inspectionParts)
        .where(eq(inspectionParts.inspectionId, req.params.id));

      const quotesList = await db
        .select()
        .from(quotes)
        .where(eq(quotes.inspectionId, req.params.id))
        .orderBy(desc(quotes.createdAt));

      res.json({ inspection, media, parts, quotes: quotesList });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ─── Inspection PDF Download ──────────────────────────────────────────────
  app.get("/api/laqit-inspections/:id/pdf", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const [inspection] = await db
        .select()
        .from(laqitInspections)
        .where(eq(laqitInspections.inspectionId, req.params.id))
        .limit(1);
      if (!inspection) return res.status(404).json({ error: "غير موجود" });
      if (inspection.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const built = await buildInspectionPdfBuffer(inspection, req.query.locale);
      if (!built.ok) {
        return res.status(built.status).json({ error: built.error });
      }
      const filename = `laqit-${inspection.inspectionNo}-${Date.now()}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", built.pdfBuffer.length);
      res.send(built.pdfBuffer);
    } catch (err: any) {
      console.error("GET inspection pdf error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء التقرير" });
    }
  });

  // ─── Inspection PDF Email ─────────────────────────────────────────────────
  app.post("/api/laqit-inspections/:id/send-pdf", requireCustomer, async (req: Request, res: Response) => {
    try {
      const ip = clientIp(req);
      if (!emailIpLimiter.check(ip)) {
        const retryAfter = emailIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { email, locale } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صحيح" });
      }

      const callerCustomerId: string = res.locals.customerId;
      const [inspection] = await db
        .select()
        .from(laqitInspections)
        .where(eq(laqitInspections.inspectionId, req.params.id))
        .limit(1);
      if (!inspection) return res.status(404).json({ error: "غير موجود" });
      if (inspection.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const built = await buildInspectionPdfBuffer(inspection, locale);
      if (!built.ok) {
        return res.status(built.status).json({ error: built.error });
      }
      const filename = `laqit-${inspection.inspectionNo}-${Date.now()}.pdf`;
      const result = await sendAnalysisPdfEmail(email, built.pdfBuffer, filename);
      if (!result.success) {
        return res.status(500).json({ error: "فشل في إرسال البريد الإلكتروني، يرجى المحاولة لاحقاً" });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("POST inspection send-pdf error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء أو إرسال التقرير" });
    }
  });

  // Send an inspection's PDF report to the logged-in customer's own WhatsApp.
  // Recipient is derived server-side from the authenticated + owning customer.
  app.post("/api/laqit-inspections/:id/whatsapp-pdf", requireCustomer, async (req: Request, res: Response) => {
    try {
      const ip = clientIp(req);
      if (!emailIpLimiter.check(ip)) {
        const retryAfter = emailIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `طلبات كثيرة جداً، يرجى المحاولة بعد ${retryAfter} ثانية` });
      }

      const { locale } = req.body;
      const callerCustomerId: string = res.locals.customerId;

      const [inspection] = await db
        .select()
        .from(laqitInspections)
        .where(eq(laqitInspections.inspectionId, req.params.id))
        .limit(1);
      if (!inspection) {
        return res.status(404).json({ error: "الفحص غير موجود" });
      }
      if (inspection.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, callerCustomerId))
        .limit(1);
      if (!customer?.mobileE164) {
        return res.status(400).json({ error: "لا يوجد رقم جوال مرتبط بحسابك" });
      }

      const built = await buildInspectionPdfBuffer(inspection, locale);
      if (!built.ok) {
        return res.status(built.status).json({ error: built.error });
      }

      const filename = `laqit-${inspection.inspectionNo}-${Date.now()}.pdf`;
      const caption = `لاقط: تقرير فحص رقم ${inspection.inspectionNo}`;

      const result = await sendWhatsAppDocument(
        customer.mobileE164,
        built.pdfBuffer,
        filename,
        caption,
        inspection.inspectionId
      );
      if (!result.success) {
        return res.status(502).json({ error: "تعذّر إرسال التقرير عبر واتساب، يرجى المحاولة لاحقاً" });
      }
      res.json({ ok: true, sentTo: maskMobile(customer.mobileE164) });
    } catch (err: any) {
      console.error("POST inspection whatsapp-pdf error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء أو إرسال التقرير" });
    }
  });

  app.post("/api/laqit-inspections/:id/media", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "غير موجود" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "غير مسموح" });
      const { fileUrl, mediaType } = req.body;
      if (!fileUrl || !mediaType) {
        return res.status(400).json({ error: "fileUrl و mediaType مطلوبان" });
      }
      const [media] = await db
        .insert(inspectionMedia)
        .values({ inspectionId: req.params.id, fileUrl, mediaType })
        .returning();
      res.json({ success: true, media });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/laqit-inspections/:id/parts", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "غير موجود" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "غير مسموح" });
      const { parts: partsList } = req.body as { parts: { partName: string; quantity?: number; source?: string }[] };
      if (!Array.isArray(partsList) || partsList.length === 0) {
        return res.status(400).json({ error: "قائمة القطع مطلوبة" });
      }
      const inserted = await db
        .insert(inspectionParts)
        .values(
          partsList.map((p) => ({
            inspectionId: req.params.id,
            partName: p.partName,
            quantity: p.quantity ?? 1,
            source: (p.source as "ai" | "user") ?? "user",
          }))
        )
        .returning();
      res.json({ success: true, parts: inserted });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.patch("/api/laqit-inspections/:id/status", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "غير موجود" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "غير مسموح" });

      const { status } = req.body;
      // Reject anything that is not a known workflow state.
      if (typeof status !== "string" || !(inspectionStatusEnum.enumValues as string[]).includes(status)) {
        return res.status(400).json({ error: "حالة غير صالحة" });
      }

      // Workflow truth (rfq_sent, quotes_received, quote_accepted, payment_pending,
      // paid, vendor_notified, ready_for_pickup, closed) is derived server-side by
      // the submit / accept / payment / webhook routes. The only state transition a
      // customer may drive directly is cancelling their own request, and only before
      // a quote has been accepted or payment has begun. Everything else is forbidden
      // so a client cannot forge payment/fulfillment milestones.
      if (status !== "cancelled") {
        return res.status(403).json({ error: "غير مسموح بتعيين هذه الحالة" });
      }

      // Idempotent: already cancelled → succeed without change.
      if (inspection.status === "cancelled") {
        return res.json({ success: true, inspection });
      }

      const CUSTOMER_CANCELLABLE_FROM = ["draft", "rfq_sent", "waiting_quotes", "quotes_received"];
      if (!CUSTOMER_CANCELLABLE_FROM.includes(inspection.status)) {
        return res.status(409).json({ error: "لا يمكن إلغاء الطلب في هذه المرحلة" });
      }

      const [updated] = await db
        .update(laqitInspections)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(laqitInspections.inspectionId, req.params.id))
        .returning();
      res.json({ success: true, inspection: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ─── RFQ Submit: targets eligible vendors and sends WhatsApp ─────────────

  app.post("/api/laqit-inspections/:id/submit", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const inspectionId = req.params.id;

      const [inspection] = await db
        .select()
        .from(laqitInspections)
        .where(eq(laqitInspections.inspectionId, inspectionId))
        .limit(1);
      if (!inspection) return res.status(404).json({ error: "الفحص غير موجود" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "غير مسموح" });

      // Replay / idempotency guard: an RFQ may only be broadcast once, from a draft
      // inspection. Atomically claim the draft → rfq_sent transition so that
      // concurrent or repeated submissions cannot fan out duplicate WhatsApp
      // messages to vendors. Only the request that wins this conditional update
      // proceeds to send; all others are rejected before any messaging side effect.
      const claimed = await db
        .update(laqitInspections)
        .set({ status: "rfq_sent", updatedAt: new Date() })
        .where(
          and(
            eq(laqitInspections.inspectionId, inspectionId),
            eq(laqitInspections.status, "draft")
          )
        )
        .returning();
      if (claimed.length === 0) {
        return res.status(409).json({ error: "تم إرسال هذا الطلب من قبل" });
      }

      // Find eligible vendors: same city + supports car model
      const locationRows = await db
        .select({ vendorId: vendorLocations.vendorId })
        .from(vendorLocations)
        .where(eq(vendorLocations.cityId, inspection.cityId));

      const cityVendorIds = locationRows.map((r) => r.vendorId);
      if (cityVendorIds.length === 0) {
        // Status was already set to rfq_sent by the atomic claim above.
        return res.json({ success: true, vendorsNotified: 0, message: "لا يوجد موردون في مدينتك بعد" });
      }

      const modelRows = await db
        .select({ vendorId: vendorSupportedModels.vendorId })
        .from(vendorSupportedModels)
        .where(
          and(
            eq(vendorSupportedModels.carModelId, inspection.carModelId),
            inArray(vendorSupportedModels.vendorId, cityVendorIds)
          )
        );

      const eligibleVendorIds = modelRows.map((r) => r.vendorId);

      // Get parts for RFQ text
      const parts = await db
        .select()
        .from(inspectionParts)
        .where(eq(inspectionParts.inspectionId, inspectionId));

      const partsText = parts.map((p) => `- ${p.partName} (${p.quantity})`).join("\n");

      // Fire-and-forget: generate analysis PDF and email it (non-blocking so WhatsApp RFQ proceeds immediately)
      void (async () => {
        try {
          const [modelRow] = await db
            .select({ modelName: carModels.modelName, makeId: carModels.makeId })
            .from(carModels)
            .where(eq(carModels.carModelId, inspection.carModelId))
            .limit(1);

          const [makeRow] = modelRow
            ? await db
                .select({ makeName: carMakes.makeName, nameAr: carMakes.nameAr })
                .from(carMakes)
                .where(eq(carMakes.makeId, modelRow.makeId))
                .limit(1)
            : [undefined];

          const [damageMedia] = await db
            .select({ fileUrl: inspectionMedia.fileUrl })
            .from(inspectionMedia)
            .where(
              and(
                eq(inspectionMedia.inspectionId, inspectionId),
                eq(inspectionMedia.mediaType, "damage_photo")
              )
            )
            .limit(1);

          const carInfo: CarInfo = {
            make: makeRow?.makeName ?? "Unknown",
            makeAr: makeRow?.nameAr ?? makeRow?.makeName ?? "غير محدد",
            model: modelRow?.modelName ?? "Unknown",
            modelAr: modelRow?.modelName ?? "غير محدد",
            year: String(inspection.carYear ?? ""),
          };

          const partEntries: PartEntry[] = parts.map((p) => ({
            id: p.inspectionPartId,
            name: p.partName,
            nameAr: p.partName,
            confidence: 85,
            price: 0,
          }));

          // Internal RFQ copy for the business owner. Fail closed: only send
          // when an explicit recipient is configured — never fall back to a
          // hard-coded address, to avoid leaking customer inspection data.
          const emailTo = process.env.ANALYSIS_EMAIL_TO;
          if (!emailTo) {
            console.warn("[Submit] ANALYSIS_EMAIL_TO not configured — skipping internal RFQ email copy");
          } else {
            const pdfBuffer = await generateAnalysisPdf(carInfo, partEntries, damageMedia?.fileUrl ?? undefined, "ar");
            const filename = `laqit-rfq-${inspection.inspectionNo}.pdf`;
            const emailResult = await sendAnalysisPdfEmail(emailTo, pdfBuffer, filename);

            if (emailResult.success) {
              console.log(`[Submit] PDF emailed to ${emailTo} — ${filename}`);
            } else {
              console.warn(`[Submit] PDF email failed: ${emailResult.error}`);
            }
          }
        } catch (pdfErr: any) {
          console.error("[Submit] PDF/email error (non-fatal):", pdfErr?.message);
        }
      })();

      let vendorsNotified = 0;

      for (const vendorId of eligibleVendorIds) {
        const [primaryUser] = await db
          .select()
          .from(vendorUsers)
          .where(
            and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.isWhatsappPrimary, true))
          )
          .limit(1);

        if (!primaryUser) continue;

        const rfqText =
          `طلب عرض سعر - لاقط\n` +
          `رقم الفحص: ${inspection.inspectionNo}\n` +
          `الموديل: ${inspection.carModelId}\n` +
          `السنة: ${inspection.carYear ?? "غير محدد"}\n\n` +
          `القطع المطلوبة:\n${partsText}\n\n` +
          `للرد: أرسل رقم الفحص ${inspection.inspectionNo} مع صورة عرض السعر الإجمالي`;

        const rfqDoc = await db
          .select()
          .from(rfqDocuments)
          .where(eq(rfqDocuments.inspectionId, inspectionId))
          .limit(1);

        const sendResult = await sendWhatsAppMessage(
          primaryUser.whatsappE164,
          rfqText,
          rfqDoc[0]?.pdfUrl,
          inspectionId
        );

        await db.insert(rfqRecipients).values({
          inspectionId,
          vendorId,
          vendorUserId: primaryUser.vendorUserId,
          channel: "whatsapp",
          status: sendResult.success ? "sent" : "failed",
          providerMessageId: sendResult.providerMessageId ?? null,
          sentAt: sendResult.success ? new Date() : null,
        });

        if (sendResult.success) vendorsNotified++;
      }

      // Status was already set to rfq_sent by the atomic claim above.
      res.json({ success: true, vendorsNotified });
    } catch (err: any) {
      console.error("Submit RFQ error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إرسال طلب العرض" });
    }
  });

  // ─── Inbound WhatsApp Webhook ─────────────────────────────────────────────

  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      const body = req.body;

      // Meta/WhatsApp Business API webhook verification
      if (req.method === "GET" && req.query["hub.mode"] === "subscribe") {
        const challenge = req.query["hub.challenge"];
        return res.send(challenge);
      }

      // ── Verify Meta webhook signature ──────────────────────────────────────
      const whatsappWebhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
      if (whatsappWebhookSecret) {
        const sigHeader = req.headers["x-hub-signature-256"] as string | undefined;
        if (!sigHeader) {
          console.warn("WhatsApp webhook: missing x-hub-signature-256 header — rejecting");
          return res.sendStatus(401);
        }
        const rawBody = req.rawBody as Buffer | undefined;
        if (!rawBody) {
          console.warn("WhatsApp webhook: raw body unavailable — rejecting");
          return res.sendStatus(400);
        }
        const expected = "sha256=" + createHmac("sha256", whatsappWebhookSecret).update(rawBody).digest("hex");
        const expectedBuf = Buffer.from(expected, "utf-8");
        const actualBuf = Buffer.from(sigHeader, "utf-8");
        if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
          console.warn("WhatsApp webhook: signature mismatch — rejecting");
          return res.sendStatus(401);
        }
      } else {
        if (process.env.NODE_ENV !== "development") {
          console.error("WhatsApp webhook: WHATSAPP_WEBHOOK_SECRET not set in production — rejecting unsigned request");
          return res.sendStatus(401);
        }
        console.warn("WhatsApp webhook: WHATSAPP_WEBHOOK_SECRET not set — skipping signature verification (development mode only)");
      }

      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) return res.sendStatus(200);

      const fromE164 = `+${message.from}`;
      const textBody: string = message?.text?.body ?? "";
      const mediaUrl: string | undefined = message?.image?.link ?? message?.document?.link;
      const providerMessageId: string = message.id ?? undefined;

      // Find vendor user by WhatsApp number
      const [vendorUser] = await db
        .select()
        .from(vendorUsers)
        .where(eq(vendorUsers.whatsappE164, fromE164))
        .limit(1);

      // Extract inspection_no from text using regex
      const match = textBody.match(/INS-\d{4}-\d{6}/i);
      const inspectionNoExtracted = match ? match[0].toUpperCase() : null;

      let inspectionId: string | null = null;
      let linkedInspection: typeof laqitInspections.$inferSelect | undefined;

      if (inspectionNoExtracted) {
        const [found] = await db
          .select()
          .from(laqitInspections)
          .where(eq(laqitInspections.inspectionNo, inspectionNoExtracted))
          .limit(1);
        if (found) {
          linkedInspection = found;
          inspectionId = found.inspectionId;
        }
      }

      // Store inbound message
      await db.insert(whatsappMessages).values({
        direction: "inbound",
        vendorId: vendorUser?.vendorId ?? null,
        vendorUserId: vendorUser?.vendorUserId ?? null,
        vendorWhatsappE164: fromE164,
        inspectionId,
        inspectionNoExtracted,
        textBody: textBody || null,
        mediaUrl: mediaUrl ?? null,
        providerMessageId: providerMessageId ?? null,
        receivedAt: new Date(),
      });

      // If no inspection_no → send auto-reply and exit
      if (!inspectionNoExtracted || !linkedInspection) {
        if (vendorUser) {
          await sendWhatsAppMessage(
            fromE164,
            "شكراً لك. لم نتمكن من ربط رسالتك بفحص. يرجى إرسال رقم الفحص (مثال: INS-2026-123456) مع صورة عرض السعر.",
            undefined
          );
        }
        return res.sendStatus(200);
      }

      // If media attached → run OCR and create quote
      if (mediaUrl && vendorUser) {
        // Verify this vendor was an RFQ recipient for the linked inspection before
        // accepting a quote — prevents forged quotes from vendors who were not invited.
        const [rfqEntry] = await db
          .select({ rfqRecipientId: rfqRecipients.rfqRecipientId })
          .from(rfqRecipients)
          .where(
            and(
              eq(rfqRecipients.inspectionId, linkedInspection.inspectionId),
              eq(rfqRecipients.vendorId, vendorUser.vendorId)
            )
          )
          .limit(1);

        if (!rfqEntry) {
          console.warn(
            `WhatsApp webhook: vendor ${vendorUser.vendorId} not an RFQ recipient for inspection ${linkedInspection.inspectionNo} — ignoring quote`
          );
          return res.sendStatus(200);
        }

        const ocrResult = await extractTotalPrice(mediaUrl);

        await db.insert(quotes).values({
          inspectionId: linkedInspection.inspectionId,
          vendorId: vendorUser.vendorId,
          vendorUserId: vendorUser.vendorUserId,
          quoteImageUrl: mediaUrl,
          totalAmount: ocrResult.totalAmount !== null ? String(ocrResult.totalAmount) : null,
          currency: ocrResult.currency,
          status: ocrResult.totalAmount !== null ? "parsed" : "unparsed",
          ocrRawText: ocrResult.rawText,
        });

        // Update inspection status if first quote
        if (linkedInspection.status === "rfq_sent" || linkedInspection.status === "waiting_quotes") {
          await db
            .update(laqitInspections)
            .set({ status: "quotes_received", updatedAt: new Date() })
            .where(eq(laqitInspections.inspectionId, linkedInspection.inspectionId));
        }

        // Notify customer via SMS
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.customerId, linkedInspection.customerId))
          .limit(1);

        if (customer) {
          const smsText = ocrResult.totalAmount
            ? `لقيت - وصل عرض سعر جديد لفحص ${linkedInspection.inspectionNo}: ${ocrResult.totalAmount} ${ocrResult.currency}. افتح التطبيق لمراجعة العروض.`
            : `لقيت - وصل عرض سعر جديد لفحص ${linkedInspection.inspectionNo}. افتح التطبيق لمراجعة العروض.`;
          await sendSms(customer.mobileE164, smsText);

          await db.insert(notifications).values({
            recipientType: "customer",
            customerId: customer.customerId,
            channel: "sms",
            status: "sent",
            inspectionId: linkedInspection.inspectionId,
            body: smsText,
            sentAt: new Date(),
          });
        }
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error("WhatsApp webhook error:", err?.message);
      res.sendStatus(200); // Always return 200 to WhatsApp
    }
  });

  // ─── Quotes ───────────────────────────────────────────────────────────────

  app.get("/api/laqit-inspections/:id/quotes", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "غير موجود" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "غير مسموح" });
      const quotesList = await db
        .select()
        .from(quotes)
        .where(eq(quotes.inspectionId, req.params.id))
        .orderBy(desc(quotes.createdAt));

      const enriched = await Promise.all(
        quotesList.map(async (q) => {
          const [vendor] = await db
            .select()
            .from(vendors)
            .where(eq(vendors.vendorId, q.vendorId))
            .limit(1);
          return { ...q, vendorName: vendor?.vendorName ?? "" };
        })
      );

      res.json({ quotes: enriched });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get("/api/quotes/:quoteId", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.quoteId, req.params.quoteId))
        .limit(1);
      if (!quote) return res.status(404).json({ error: "غير موجود" });
      const [insp] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, quote.inspectionId)).limit(1);
      if (!insp || insp.customerId !== callerCustomerId) return res.status(403).json({ error: "غير مسموح" });
      const [vendor] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.vendorId, quote.vendorId))
        .limit(1);
      res.json({ quote: { ...quote, vendorName: vendor?.vendorName ?? "" } });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/laqit-inspections/:id/quotes/:quoteId/accept", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const { id: inspectionId, quoteId } = req.params;
      const [insp] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, inspectionId)).limit(1);
      if (!insp) return res.status(404).json({ error: "غير موجود" });
      if (insp.customerId !== callerCustomerId) return res.status(403).json({ error: "غير مسموح" });

      // Block re-acceptance once inspection status reflects a payment or terminal state.
      // Covers: payment_pending, paid, cancelled, and downstream fulfillment states.
      const lockedStatuses = [
        "payment_pending",
        "paid",
        "cancelled",
        "vendor_notified",
        "ready_for_pickup",
        "closed",
      ];
      if (lockedStatuses.includes(insp.status)) {
        return res.status(409).json({ error: "لا يمكن تغيير العرض بعد بدء الدفع أو اكتماله" });
      }

      // Secondary guard: check payments table directly for any active payment row.
      // This closes the race window between payment row insert and the inspection
      // status flip to payment_pending — the status check above may not yet reflect
      // an in-flight concurrent payment creation, but the payments row will exist.
      const [activePayment] = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.inspectionId, inspectionId),
            inArray(payments.status, ["initiated", "captured"])
          )
        )
        .limit(1);
      if (activePayment) {
        return res.status(409).json({ error: "لا يمكن تغيير العرض بعد بدء الدفع أو اكتماله" });
      }

      // Verify the quoteId belongs to this inspection (prevents cross-inspection tampering)
      const [targetQuote] = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.quoteId, quoteId), eq(quotes.inspectionId, inspectionId)))
        .limit(1);
      if (!targetQuote) return res.status(404).json({ error: "العرض غير موجود أو لا ينتمي لهذا الطلب" });

      // Reject all other quotes for this inspection
      const allQuotes = await db
        .select()
        .from(quotes)
        .where(eq(quotes.inspectionId, inspectionId));

      for (const q of allQuotes) {
        if (q.quoteId !== quoteId) {
          await db.update(quotes).set({ status: "rejected" }).where(and(eq(quotes.quoteId, q.quoteId), eq(quotes.inspectionId, inspectionId)));
        }
      }

      // Accept the selected quote (scoped to both quoteId and inspectionId)
      await db
        .update(quotes)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(and(eq(quotes.quoteId, quoteId), eq(quotes.inspectionId, inspectionId)));

      // Update inspection status
      await db
        .update(laqitInspections)
        .set({ status: "quote_accepted", updatedAt: new Date() })
        .where(eq(laqitInspections.inspectionId, inspectionId));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ─── Payments ─────────────────────────────────────────────────────────────

  app.post("/api/payments", requireCustomer, async (req: Request, res: Response) => {
    try {
      const callerCustomerId: string = res.locals.customerId;
      const { inspectionId, quoteId, customerId } = req.body;
      if (!inspectionId || !quoteId || !customerId) {
        return res.status(400).json({ error: "بيانات الدفع غير مكتملة" });
      }
      if (customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      const [insp] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, inspectionId)).limit(1);
      if (!insp || insp.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const [quote] = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.quoteId, quoteId), eq(quotes.inspectionId, inspectionId)))
        .limit(1);
      if (!quote) return res.status(404).json({ error: "العرض غير موجود أو لا ينتمي لهذا الطلب" });

      // Only allow payment against the customer-accepted quote — prevents forging
      // a payment record for an arbitrary quote on this inspection.
      if (quote.status !== "accepted") {
        return res.status(400).json({ error: "لا يمكن الدفع إلا للعرض المقبول" });
      }

      const amount = parseFloat(quote.totalAmount ?? "0");
      const intent = await createPaymentIntent(amount, quote.currency, {
        inspectionId,
        quoteId,
        customerId,
      });

      // Atomically insert the payment row and flip inspection status inside a
      // single transaction. This eliminates the race window where quote-acceptance
      // could slip in between the two separate DML statements.
      let payment: typeof payments.$inferSelect;
      try {
        payment = await db.transaction(async (tx) => {
          const [inserted] = await tx
            .insert(payments)
            .values({
              inspectionId,
              quoteId,
              customerId,
              amount: String(amount),
              currency: quote.currency,
              status: "initiated",
              gateway: "stripe",
              gatewayRef: intent.id,
            })
            .returning();

          await tx
            .update(laqitInspections)
            .set({ status: "payment_pending", updatedAt: new Date() })
            .where(eq(laqitInspections.inspectionId, inspectionId));

          return inserted;
        });
      } catch (insertErr: any) {
        // Unique constraint uq_one_live_payment_per_inspection fires when a
        // concurrent request already inserted an active payment row. Return 409
        // regardless of whether this arrived via race or a sequential retry.
        if (insertErr?.code === "23505") {
          return res.status(409).json({ error: "يوجد دفع نشط لهذا الطلب بالفعل" });
        }
        throw insertErr;
      }

      res.json({ success: true, payment, clientSecret: intent.clientSecret });
    } catch (err: any) {
      console.error("Create payment error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء الدفع" });
    }
  });

  // Payment webhook (Stripe or mock)
  app.post("/api/webhooks/payment", async (req, res) => {
    try {
      // ── Verify Stripe webhook signature ────────────────────────────────────
      // Stripe signs every webhook with a HMAC-SHA256 over "<timestamp>.<rawBody>"
      // and includes it in the `stripe-signature` header as "t=...,v1=...".
      // When PAYMENT_WEBHOOK_SECRET is set we enforce the signature; otherwise we
      // log a warning and allow through (development / stub mode only).
      const paymentWebhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (paymentWebhookSecret) {
        const sigHeader = req.headers["stripe-signature"] as string | undefined;
        if (!sigHeader) {
          console.warn("Payment webhook: missing stripe-signature header — rejecting");
          return res.sendStatus(401);
        }
        const rawBody = req.rawBody as Buffer | undefined;
        if (!rawBody) {
          console.warn("Payment webhook: raw body unavailable — rejecting");
          return res.sendStatus(400);
        }
        // Parse t= and v1= from header
        const parts: Record<string, string> = {};
        for (const part of sigHeader.split(",")) {
          const [k, v] = part.split("=");
          if (k && v) parts[k.trim()] = v.trim();
        }
        const timestamp = parts["t"];
        const v1Signature = parts["v1"];
        if (!timestamp || !v1Signature) {
          console.warn("Payment webhook: malformed stripe-signature header — rejecting");
          return res.sendStatus(401);
        }
        // Reject stale webhooks (> 5 minutes old) to prevent replay attacks
        const tsDiff = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
        if (tsDiff > 300) {
          console.warn(`Payment webhook: timestamp too old (${tsDiff}s) — rejecting`);
          return res.sendStatus(401);
        }
        const signedPayload = `${timestamp}.${rawBody.toString("utf-8")}`;
        const expected = createHmac("sha256", paymentWebhookSecret).update(signedPayload).digest("hex");
        const expectedBuf = Buffer.from(expected, "hex");
        const actualBuf = Buffer.from(v1Signature, "hex");
        if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
          console.warn("Payment webhook: signature mismatch — rejecting");
          return res.sendStatus(401);
        }
      } else {
        if (process.env.NODE_ENV !== "development") {
          console.error("Payment webhook: PAYMENT_WEBHOOK_SECRET not set in production — rejecting unsigned request");
          return res.sendStatus(401);
        }
        console.warn("Payment webhook: PAYMENT_WEBHOOK_SECRET not set — skipping signature verification (development mode only)");
      }

      const event = req.body;
      const eventType: string = event?.type ?? event?.status ?? "";

      if (eventType === "payment_intent.succeeded" || eventType === "captured") {
        const gatewayRef: string =
          event?.data?.object?.id ?? event?.gatewayRef ?? "";

        if (!gatewayRef) return res.sendStatus(200);

        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.gatewayRef, gatewayRef))
          .limit(1);

        if (!payment) return res.sendStatus(200);

        // Idempotency: skip if already captured
        if (payment.status === "captured") return res.sendStatus(200);

        // Guard: only transition to paid when the inspection is in the expected
        // payment-in-flight state. Reject transitions from any other state
        // (already paid, cancelled, rewound, etc.) to prevent state corruption.
        const [webhookInsp] = await db
          .select()
          .from(laqitInspections)
          .where(eq(laqitInspections.inspectionId, payment.inspectionId))
          .limit(1);
        if (!webhookInsp || webhookInsp.status !== "payment_pending") return res.sendStatus(200);

        // Guard: verify the quote tied to this payment is still the accepted quote.
        // If acceptance was somehow changed (race), the original quote would have been
        // rejected; do not notify the wrong vendor or overwrite state.
        const [paymentQuote] = await db
          .select()
          .from(quotes)
          .where(and(eq(quotes.quoteId, payment.quoteId), eq(quotes.inspectionId, payment.inspectionId)))
          .limit(1);
        if (!paymentQuote || paymentQuote.status !== "accepted") {
          console.warn(`Payment webhook: quote ${payment.quoteId} is no longer accepted — skipping paid transition`);
          return res.sendStatus(200);
        }

        await db
          .update(payments)
          .set({ status: "captured", paidAt: new Date() })
          .where(eq(payments.paymentId, payment.paymentId));

        await db
          .update(laqitInspections)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(laqitInspections.inspectionId, payment.inspectionId));

        // Notify vendor via WhatsApp
        const [acceptedQuote] = await db
          .select()
          .from(quotes)
          .where(eq(quotes.quoteId, payment.quoteId))
          .limit(1);

        if (acceptedQuote) {
          const [primaryUser] = await db
            .select()
            .from(vendorUsers)
            .where(
              and(
                eq(vendorUsers.vendorId, acceptedQuote.vendorId),
                eq(vendorUsers.isWhatsappPrimary, true)
              )
            )
            .limit(1);

          if (primaryUser) {
            const [inspection] = await db
              .select()
              .from(laqitInspections)
              .where(eq(laqitInspections.inspectionId, payment.inspectionId))
              .limit(1);

            if (inspection) {
              const msg = `لقيت - تم الدفع لفحص رقم ${inspection.inspectionNo}. يرجى تجهيز القطع للاستلام. شكراً لتعاملكم معنا.`;
              await sendWhatsAppMessage(
                primaryUser.whatsappE164,
                msg,
                undefined,
                payment.inspectionId
              );

              await db.insert(notifications).values({
                recipientType: "vendor",
                vendorUserId: primaryUser.vendorUserId,
                channel: "whatsapp",
                status: "sent",
                inspectionId: payment.inspectionId,
                body: msg,
                sentAt: new Date(),
              });
            }
          }
        }
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error("Payment webhook error:", err?.message);
      res.sendStatus(200);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
