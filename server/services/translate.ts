import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const ARABIC_RE = /[\u0600-\u06FF]/;

// Translate a list of Arabic car-part labels into concise English equivalents.
// Used when generating an English PDF for inspections whose parts are stored
// in Arabic only. Returns a parallel array (same length/order). On any failure
// or for entries that contain no Arabic, the original string is returned so the
// report still renders.
export async function translatePartNames(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  // Only translate entries that actually contain Arabic text.
  const indexesToTranslate = names
    .map((n, i) => (ARABIC_RE.test(n) ? i : -1))
    .filter((i) => i >= 0);

  if (indexesToTranslate.length === 0) return [...names];

  const toTranslate = indexesToTranslate.map((i) => names[i]);

  const systemPrompt = `You translate Arabic car spare-part labels into concise English.
Each label may combine a part name, its position (front/rear/left/right), and a condition (e.g. dented, scratched, repainted, cracked, missing).

Rules:
- Translate to natural, concise automotive English (e.g. "الباب الخلفي الأيمن - مضغوط" -> "Rear Right Door - Dented").
- Keep the same order and the same number of items as the input.
- Preserve any separators like " - " between the part and its condition.
- Do NOT add explanations, numbering, or extra words.

You MUST return this exact JSON shape (no extra text):
{ "translations": ["English 1", "English 2", ...] }
The "translations" array MUST have exactly the same length as the input list.`;

  try {
    const response = await openai.chat.completions.create(
      {
        model: "gpt-5",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Translate these ${toTranslate.length} Arabic car-part labels to English:\n${JSON.stringify(
              toTranslate
            )}`,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      },
      { timeout: 30000 }
    );

    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason === "length") {
      console.error("[Translate] Response truncated (finish_reason=length); keeping Arabic names");
      return [...names];
    }

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { translations?: unknown };
    const translations = Array.isArray(parsed.translations) ? parsed.translations : [];

    const result = [...names];
    indexesToTranslate.forEach((originalIndex, k) => {
      const translated = translations[k];
      if (typeof translated === "string" && translated.trim()) {
        result[originalIndex] = translated.trim();
      }
    });
    return result;
  } catch (err: any) {
    console.error("[Translate] Error:", err?.message);
    return [...names];
  }
}
