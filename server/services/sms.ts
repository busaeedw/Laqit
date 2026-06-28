export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True when the message was not actually delivered to a real device (dev stub). */
  stub?: boolean;
}

const TWILIO_TIMEOUT_MS = 10_000;

/** Masks an E.164 number for logs, e.g. +966512345678 -> +9665****78. */
function maskNumber(e164: string): string {
  if (!e164 || e164.length < 6) return "***";
  return `${e164.slice(0, 5)}****${e164.slice(-2)}`;
}

/**
 * Sends an SMS via Twilio's Messages API.
 *
 * Requires three secrets:
 *  - TWILIO_ACCOUNT_SID   (starts with "AC")
 *  - TWILIO_AUTH_TOKEN
 *  - TWILIO_PHONE_NUMBER  (an SMS-capable Twilio number in E.164, e.g. +1...,
 *                          or a Messaging Service SID starting with "MG")
 *
 * When the credentials are missing the behaviour depends on the environment:
 *  - production: returns failure without sending and without logging the body
 *    (the body may contain an OTP), so callers never report a false success.
 *  - development: falls back to a stub that logs the message so the app can be
 *    tested without a real device.
 */
export async function sendSms(
  toE164: string,
  body: string
): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const sender = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !sender) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[SMS] Twilio is not configured; refusing to send to ${maskNumber(toE164)}.`
      );
      return { success: false, error: "SMS provider not configured" };
    }
    // Development-only stub: surface the message in logs so the OTP flow can be
    // tested without a real device.
    console.log(`[SMS STUB] Twilio not configured (dev). To ${maskNumber(toE164)}:`);
    console.log(`  ${body}`);
    return { success: true, messageId: `mock_sms_${Date.now()}`, stub: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TWILIO_TIMEOUT_MS);
  try {
    const params = new URLSearchParams({ To: toE164, Body: body });
    // The sender may be a Messaging Service SID (MG...) or a phone number.
    if (sender.startsWith("MG")) {
      params.set("MessagingServiceSid", sender);
    } else {
      params.set("From", sender);
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: params.toString(),
        signal: controller.signal,
      }
    );

    const result = (await response.json().catch(() => ({}))) as any;

    if (!response.ok || !result?.sid) {
      const errMsg = result?.message || `HTTP ${response.status}`;
      console.error(
        `[SMS] Twilio send to ${maskNumber(toE164)} failed (code ${result?.code ?? response.status}): ${errMsg}`
      );
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: result.sid };
  } catch (err: any) {
    const reason = err?.name === "AbortError" ? "request timed out" : err?.message;
    console.error(`[SMS] Twilio send to ${maskNumber(toE164)} error: ${reason}`);
    return { success: false, error: reason };
  } finally {
    clearTimeout(timeout);
  }
}
