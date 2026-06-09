import { db } from "../db";
import { whatsappMessages } from "../../shared/schema";

export interface WhatsAppSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  toE164: string,
  text: string,
  pdfUrl?: string,
  inspectionId?: string
): Promise<WhatsAppSendResult> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiKey || !phoneNumberId) {
    console.log(`[WhatsApp STUB] Would send to ${toE164}:`);
    console.log(`  Text: ${text.substring(0, 100)}...`);
    if (pdfUrl) console.log(`  PDF: ${pdfUrl}`);
    const mockId = `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(whatsappMessages).values({
      direction: "outbound",
      vendorWhatsappE164: toE164,
      inspectionId: inspectionId ?? null,
      textBody: text,
      mediaUrl: pdfUrl ?? null,
      providerMessageId: mockId,
      sentAt: new Date(),
    });
    return { success: true, providerMessageId: mockId };
  }

  try {
    const body: any = {
      messaging_product: "whatsapp",
      to: toE164,
      type: "text",
      text: { body: text },
    };

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json() as any;
    const providerMessageId = result?.messages?.[0]?.id ?? undefined;

    await db.insert(whatsappMessages).values({
      direction: "outbound",
      vendorWhatsappE164: toE164,
      inspectionId: inspectionId ?? null,
      textBody: text,
      mediaUrl: pdfUrl ?? null,
      providerMessageId: providerMessageId ?? null,
      sentAt: new Date(),
    });

    return { success: response.ok, providerMessageId };
  } catch (err: any) {
    console.error("[WhatsApp] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}
