import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface OcrResult {
  totalAmount: number | null;
  currency: string;
  rawText: string;
  confidence: number;
}

export async function extractTotalPrice(imageUrl: string): Promise<OcrResult> {
  const systemPrompt = `You are an OCR system specialized in reading spare parts quote invoices.
Your ONLY job is to extract the GRAND TOTAL / TOTAL price from the quote image.

Rules:
- Look for labels like "المجموع", "الإجمالي", "Total", "Grand Total", "TOTAL", "المجموع الكلي"
- The amount is a number (may include commas as thousands separator and a decimal point)
- Currency is usually SAR, ريال, SR, or SAR
- Return ONLY the final total, NOT subtotals or VAT lines
- If you cannot find a clear total, return null for totalAmount

You MUST return this exact JSON (no extra text):
{
  "totalAmount": 1250.00,
  "currency": "SAR",
  "rawText": "all text visible in the image",
  "confidence": 85
}

Where:
- totalAmount: number or null
- currency: 3-letter string (default SAR)
- rawText: all text you can read from the image
- confidence: integer 0-100, how confident you are in the total extraction`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the total price from this spare parts quote image." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as Partial<OcrResult>;

    return {
      totalAmount: typeof parsed.totalAmount === "number" ? parsed.totalAmount : null,
      currency: typeof parsed.currency === "string" ? parsed.currency : "SAR",
      rawText: typeof parsed.rawText === "string" ? parsed.rawText : "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    };
  } catch (err: any) {
    console.error("[OCR] Error:", err?.message);
    return { totalAmount: null, currency: "SAR", rawText: "", confidence: 0 };
  }
}
