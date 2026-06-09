import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { db } from "./db";
import { signToken, requireCustomer, issueOtp, verifyOtp } from "./auth";
import {
  users,
  inspections,
  cities,
  carMakes,
  carModels,
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
} from "../shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { sendWhatsAppMessage } from "./services/whatsapp";
import { sendSms } from "./services/sms";
import { extractTotalPrice } from "./services/ocr";
import { createPaymentIntent } from "./services/payment";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

  // User Login
  app.post("/api/login", async (req, res) => {
    try {
      const { name, mobile } = req.body;

      if (!name || !mobile) {
        return res.status(400).json({ error: "الاسم ورقم الجوال مطلوبان" });
      }

      const [user] = await db.select().from(users).where(
        and(eq(users.name, name), eq(users.mobile, mobile))
      ).limit(1);

      if (!user) {
        return res.status(401).json({ error: "الاسم أو رقم الجوال غير صحيح" });
      }

      res.json({ success: true, user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email } });
    } catch (error: any) {
      console.error("Login error:", error?.message);
      res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  // Save Inspection
  app.post("/api/inspections", async (req, res) => {
    try {
      const { userId, carMake, carMakeAr, carModel, carModelAr, carYear, parts } = req.body;

      if (!userId || !carMake || !carModel || !parts) {
        return res.status(400).json({ error: "بيانات الفحص غير مكتملة" });
      }

      // Generate unique inspection number (format: INS-YYYYMMDD-XXXX)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const inspectionNumber = `INS-${dateStr}-${randomNum}`;

      const [newInspection] = await db.insert(inspections).values({
        inspectionNumber,
        userId,
        carMake,
        carMakeAr: carMakeAr || null,
        carModel,
        carModelAr: carModelAr || null,
        carYear: carYear || null,
        parts: JSON.stringify(parts),
      }).returning();

      res.json({ 
        success: true, 
        inspection: {
          id: newInspection.id,
          inspectionNumber: newInspection.inspectionNumber,
          carMake: newInspection.carMake,
          carMakeAr: newInspection.carMakeAr,
          carModel: newInspection.carModel,
          carModelAr: newInspection.carModelAr,
          carYear: newInspection.carYear,
          parts: JSON.parse(newInspection.parts),
          createdAt: newInspection.createdAt,
        }
      });
    } catch (error: any) {
      console.error("Save inspection error:", error?.message);
      res.status(500).json({ error: "حدث خطأ أثناء حفظ الفحص" });
    }
  });

  // Get User Inspections
  app.get("/api/inspections/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: "معرف المستخدم مطلوب" });
      }

      const userInspections = await db.select()
        .from(inspections)
        .where(eq(inspections.userId, userId))
        .orderBy(desc(inspections.createdAt));

      const formattedInspections = userInspections.map(inspection => ({
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        carMake: inspection.carMake,
        carMakeAr: inspection.carMakeAr,
        carModel: inspection.carModel,
        carModelAr: inspection.carModelAr,
        carYear: inspection.carYear,
        parts: JSON.parse(inspection.parts),
        createdAt: inspection.createdAt,
      }));

      res.json({ success: true, inspections: formattedInspections });
    } catch (error: any) {
      console.error("Get inspections error:", error?.message);
      res.status(500).json({ error: "حدث خطأ أثناء جلب الفحوصات" });
    }
  });


  app.post("/api/analyze", async (req, res) => {
    try {
      const { imageUri, carInfo } = req.body;
      
      console.log("Received analyze request");
      console.log("Image URI length:", imageUri?.length || 0);
      console.log("Image starts with:", imageUri?.substring(0, 50));

      const systemPrompt = `You are an expert automotive damage and missing parts detection system. You MUST analyze the image and identify the car, then detect any missing, damaged, broken, or worn parts.

IMPORTANT: You MUST ALWAYS return valid JSON in the exact format specified below. NEVER return error messages or plain text.

STEP 1 - Identify the car:
- Look for visible text on the car (brand names like "ODYSSEY", "FLEX", "CAMRY", etc.)
- Look for brand logos/emblems (Honda "H", Ford oval, Toyota logo, etc.)
- Study the body shape, taillights, and distinctive features
- Estimate the year based on the generation/design

STEP 2 - Detect missing or damaged parts:
- Look carefully for any MISSING parts (e.g., missing bumper, missing mirror, missing headlight, missing trim piece, missing emblem, missing grille)
- Look for DAMAGED parts (cracked bumpers, broken lights, dented panels, scratched paint, broken mirrors, cracked windshield)
- Look for WORN parts (faded paint, worn tires, rusted areas, deteriorated rubber seals)
- For each issue found, describe the condition: "missing", "damaged", "cracked", "broken", "dented", "scratched", "worn", "faded", etc.
- Provide realistic replacement/repair prices in Saudi Riyals (SAR)

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
      "boundingBox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2 }
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
- Focus on finding MISSING and DAMAGED parts - this is a damage inspection tool
- If the car appears in good condition with no visible damage, still check carefully for minor issues like scratches, worn tires, faded paint, etc.
- If truly no damage is found, return an empty parts array
- ALWAYS provide Arabic translations (makeAr, modelAr, nameAr, descriptionAr, conditionAr, primaryUseAr)
- Confidence should reflect how certain you are about the damage (60-100)
- Prices should be realistic replacement/repair estimates in SAR
- NEVER return an error message - always return the JSON structure above`;

      const userMessage = carInfo
        ? `The user has selected: ${carInfo.make} ${carInfo.model} ${carInfo.year}. Inspect the car image carefully for any missing, damaged, broken, worn, or defective parts.`
        : `Identify the car make, model, year, then inspect the image carefully for any missing, damaged, broken, worn, or defective parts.`;

      console.log("Calling OpenAI API with model gpt-4o...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              {
                type: "image_url",
                image_url: { url: imageUri },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2048,
      });

      console.log("OpenAI API response received");
      const content = response.choices[0]?.message?.content || "{}";
      console.log("Response content:", content.substring(0, 300));
      const result = JSON.parse(content);

      // Validate the response has the expected structure
      if (!result.carInfo || !result.parts) {
        console.log("Invalid response structure, returning default");
        return res.json({
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

  app.post("/api/identify-car", async (req, res) => {
    try {
      const { imageUri } = req.body;
      if (!imageUri) return res.status(400).json({ error: "imageUri required" });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
        max_tokens: 256,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(raw);
      res.json(result);
    } catch (err: any) {
      console.error("identify-car error:", err?.message);
      res.status(500).json({ error: "فشل في تحليل صورة السيارة" });
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

  app.get("/api/car-makes", async (_req, res) => {
    try {
      const result = await db.select().from(carMakes).orderBy(carMakes.makeName);
      res.json({ makes: result });
    } catch (err: any) {
      console.error("GET /api/car-makes error:", err?.message);
      res.status(500).json({ error: "خطأ في جلب الماركات" });
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
      const { fullName, mobileE164, email, cityId } = req.body;
      if (!mobileE164 || !email || !cityId) {
        return res.status(400).json({ error: "رقم الجوال والبريد والمدينة مطلوبة" });
      }
      const [customer] = await db
        .insert(customers)
        .values({ fullName: fullName ?? null, mobileE164, email, cityId })
        .returning();

      const result = issueOtp(mobileE164);
      const code = "code" in result ? result.code : null;
      if (code) {
        const { sendSms } = await import("./services/sms");
        await sendSms(mobileE164, `لاقط: رمز التحقق الخاص بك هو ${code}. صالح لمدة 5 دقائق.`);
      }
      res.json({ success: true, message: "تم إنشاء الحساب. أدخل رمز التحقق المرسل إلى جوالك" });
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(400).json({ error: "رقم الجوال أو البريد الإلكتروني مسجل مسبقاً" });
      }
      console.error("Customer register error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء التسجيل" });
    }
  });

  app.post("/api/customers/login", async (req, res) => {
    try {
      const { mobileE164 } = req.body;
      if (!mobileE164) return res.status(400).json({ error: "رقم الجوال مطلوب" });
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.mobileE164, mobileE164))
        .limit(1);
      if (!customer) return res.status(404).json({ error: "المستخدم غير موجود" });

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
      const { mobileE164, otp } = req.body;
      if (!mobileE164 || !otp) return res.status(400).json({ error: "رقم الجوال ورمز التحقق مطلوبان" });

      const result = verifyOtp(mobileE164, String(otp));
      if (!result.success) {
        return res.status(400).json({ error: result.error, attemptsLeft: result.attemptsLeft });
      }

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.mobileE164, mobileE164))
        .limit(1);
      if (!customer) return res.status(404).json({ error: "المستخدم غير موجود" });

      await db
        .update(customers)
        .set({ lastLoginAt: new Date() })
        .where(eq(customers.customerId, customer.customerId));

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

  app.get("/api/vendors", async (_req, res) => {
    try {
      const result = await db.select().from(vendors).orderBy(vendors.createdAt);
      res.json({ vendors: result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/vendors", async (req, res) => {
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

  app.get("/api/vendor-users", async (_req, res) => {
    try {
      const result = await db.select().from(vendorUsers).orderBy(vendorUsers.createdAt);
      res.json({ vendorUsers: result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/vendor-users", async (req, res) => {
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
      const [updated] = await db
        .update(laqitInspections)
        .set({ status, updatedAt: new Date() })
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

      // Find eligible vendors: same city + supports car model
      const locationRows = await db
        .select({ vendorId: vendorLocations.vendorId })
        .from(vendorLocations)
        .where(eq(vendorLocations.cityId, inspection.cityId));

      const cityVendorIds = locationRows.map((r) => r.vendorId);
      if (cityVendorIds.length === 0) {
        await db
          .update(laqitInspections)
          .set({ status: "rfq_sent", updatedAt: new Date() })
          .where(eq(laqitInspections.inspectionId, inspectionId));
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

      await db
        .update(laqitInspections)
        .set({ status: "rfq_sent", updatedAt: new Date() })
        .where(eq(laqitInspections.inspectionId, inspectionId));

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

      const amount = parseFloat(quote.totalAmount ?? "0");
      const intent = await createPaymentIntent(amount, quote.currency, {
        inspectionId,
        quoteId,
        customerId,
      });

      const [payment] = await db
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

      await db
        .update(laqitInspections)
        .set({ status: "payment_pending", updatedAt: new Date() })
        .where(eq(laqitInspections.inspectionId, inspectionId));

      res.json({ success: true, payment, clientSecret: intent.clientSecret });
    } catch (err: any) {
      console.error("Create payment error:", err?.message);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء الدفع" });
    }
  });

  // Payment webhook (Stripe or mock)
  app.post("/api/webhooks/payment", async (req, res) => {
    try {
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
