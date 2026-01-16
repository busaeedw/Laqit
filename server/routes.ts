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

      const systemPrompt = `You are an expert automotive parts identification system with extensive knowledge of all car makes, models, and years. 

CRITICAL INSTRUCTIONS:
1. FIRST, carefully identify the car's make, model, and year by looking at:
   - Badge/emblem on the car (Ford, Toyota, Honda, etc.)
   - Body shape and design cues
   - Distinctive features (grille design, taillight shape, etc.)
   - Any visible text or logos
   
2. THEN identify all visible car parts that can be identified

For the car identification:
- Look carefully at the brand emblem/badge
- If you see "Ford" logo, it's a Ford vehicle
- If you see "FLEX" text, it's a Ford Flex
- Be accurate - don't default to common cars like Toyota Camry

For each identified part, provide:
- name (English)
- nameAr (Arabic name)
- description (English)
- descriptionAr (Arabic description)
- primaryUse (English - what this part is used for)
- primaryUseAr (Arabic - what this part is used for)
- estimated price in SAR (Saudi Riyals)
- confidence level (0-100 percentage of how confident you are in the identification)
- approximate bounding box location (x, y, width, height as percentages 0-1)

Return JSON in this format:
{
  "carInfo": {
    "make": "Toyota",
    "makeAr": "تويوتا",
    "model": "Camry",
    "modelAr": "كامري",
    "year": "2023"
  },
  "parts": [
    {
      "id": "1",
      "name": "Headlight Assembly",
      "nameAr": "مجموعة المصباح الأمامي",
      "description": "LED Headlight with DRL",
      "descriptionAr": "مصباح LED مع إضاءة نهارية",
      "primaryUse": "Provides illumination for night driving and visibility",
      "primaryUseAr": "توفير الإضاءة للقيادة الليلية والرؤية",
      "price": 850,
      "confidence": 92,
      "boundingBox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2 }
    }
  ]
}`;

      const userMessage = carInfo
        ? `The user has selected: ${carInfo.make} ${carInfo.model} ${carInfo.year}. Analyze the car parts visible in the image.`
        : `Identify the car make, model, year, and all visible parts in the image.`;

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
                image_url: { url: imageUri },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const result = JSON.parse(content);

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
