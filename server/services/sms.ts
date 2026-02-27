export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(
  toE164: string,
  body: string
): Promise<SmsSendResult> {
  const apiKey = process.env.SMS_API_KEY;

  if (!apiKey) {
    console.log(`[SMS STUB] Would send to ${toE164}:`);
    console.log(`  Message: ${body}`);
    return { success: true, messageId: `mock_sms_${Date.now()}` };
  }

  try {
    const response = await fetch("https://api.unifonic.com/rest/Messages/Send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        AppSid: apiKey,
        Recipient: toE164,
        Body: body,
      }).toString(),
    });

    const result = await response.json() as any;
    return {
      success: response.ok && result?.Success,
      messageId: result?.Data?.MessageID,
    };
  } catch (err: any) {
    console.error("[SMS] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}
