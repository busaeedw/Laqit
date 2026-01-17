import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
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
