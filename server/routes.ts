import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { db } from "./db";
import { users, inspections } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

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

  // Endpoint for identifying car only (brand, model, year) - used by step 1
  app.post("/api/identify-car", async (req, res) => {
    try {
      const { imageUri } = req.body;
      
      console.log("Received car identification request");

      const systemPrompt = `You are an expert car identification system. Analyze the image and identify ONLY the car make, model, and year.

Look for:
- Brand logos/emblems (Toyota, Honda, Ford, BMW, Mercedes, Hyundai, Nissan, etc.)
- Visible text on the car (model names like "Camry", "Accord", "Altima", etc.)
- Body shape, distinctive design features, headlights, grille design
- Estimate the year based on the car's generation/design

You MUST return this exact JSON structure:
{
  "make": "Toyota",
  "makeAr": "تويوتا",
  "model": "Camry",
  "modelAr": "كامري",
  "year": "2023"
}

Common Arabic translations:
- Toyota = تويوتا, Honda = هوندا, Nissan = نيسان, Hyundai = هيونداي
- Ford = فورد, BMW = بي إم دبليو, Mercedes = مرسيدس, Chevrolet = شيفروليه
- Kia = كيا, Mazda = مازدا, Lexus = لكزس, GMC = جي إم سي

RULES:
- ALWAYS provide Arabic translations
- Be as specific as possible about the model
- Estimate the year based on design features
- If uncertain, provide your best guess with the most likely match`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this car's make, model, and year." },
              {
                type: "image_url",
                image_url: { url: imageUri },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || "{}";
      console.log("Car identification result:", content);
      const result = JSON.parse(content);

      res.json(result);
    } catch (error: any) {
      console.error("Car identification error:", error?.message);
      res.status(500).json({
        make: "Unknown",
        makeAr: "غير معروف",
        model: "Unknown",
        modelAr: "غير معروف",
        year: "---",
      });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { imageUri, carInfo } = req.body;
      
      console.log("Received analyze request");
      console.log("Image URI length:", imageUri?.length || 0);
      console.log("Image starts with:", imageUri?.substring(0, 50));

      const systemPrompt = `You are an expert automotive parts identification system. You MUST analyze the image and identify the car and its parts.

IMPORTANT: You MUST ALWAYS return valid JSON in the exact format specified below. NEVER return error messages or plain text.

STEP 1 - Identify the car:
- Look for visible text on the car (brand names like "ODYSSEY", "FLEX", "CAMRY", etc.)
- Look for brand logos/emblems (Honda "H", Ford oval, Toyota logo, etc.)
- Study the body shape, taillights, and distinctive features
- If you see "Honda" logo or "ODYSSEY" text, it's a Honda Odyssey
- If you see "Ford" logo or "FLEX" text, it's a Ford Flex
- Estimate the year based on the generation/design

STEP 2 - Identify visible parts:
- Taillights, bumpers, trunk/tailgate, mirrors, windows, etc.
- Provide realistic prices in Saudi Riyals (SAR)

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
      "name": "Tail Light Assembly",
      "nameAr": "مجموعة المصباح الخلفي",
      "description": "LED Tail light with turn signal",
      "descriptionAr": "مصباح خلفي LED مع إشارة الانعطاف",
      "primaryUse": "Provides visibility and signals to other drivers",
      "primaryUseAr": "توفير الرؤية والإشارات للسائقين الآخرين",
      "price": 750,
      "confidence": 85,
      "boundingBox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2 }
    }
  ]
}

RULES:
- ALWAYS identify at least 2-4 car parts from the image
- ALWAYS provide Arabic translations (makeAr, modelAr, nameAr, descriptionAr, primaryUseAr)
- Confidence should reflect how certain you are (60-100)
- Prices should be realistic estimates in SAR
- NEVER return an error message - always return the JSON structure above`;

      const userMessage = carInfo
        ? `The user has selected: ${carInfo.make} ${carInfo.model} ${carInfo.year}. Analyze the car parts visible in the image.`
        : `Identify the car make, model, year, and all visible parts in the image.`;

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

  const httpServer = createServer(app);

  return httpServer;
}
