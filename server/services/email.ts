// Email delivery via the AgentMail Replit connector (Microsoft Graph / SMTP
// basic auth are blocked on the configured mailboxes, so we send through
// AgentMail's API instead). The connector SDK injects auth automatically.
import { ReplitConnectors } from "@replit/connectors-sdk";

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// The AgentMail inbox that reports are sent FROM.
const AGENTMAIL_INBOX = process.env.AGENTMAIL_INBOX ?? "wbusaeed@agentmail.to";

const EMAIL_HTML = `
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1E74F2;">لاقط — تقرير تشخيص السيارة</h2>
    <p>مرحباً،</p>
    <p>يرجى الاطلاع على تقرير تشخيص سيارتك المرفق أدناه.</p>
    <p>يحتوي التقرير على معلومات السيارة والقطع المكتشفة مع الأسعار التقديرية.</p>
    <hr />
    <p style="color: #888; font-size: 12px;">تم إرسال هذا البريد تلقائياً من منصة لاقط.</p>
  </div>
`;

export async function sendAnalysisPdfEmail(
  to: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<EmailSendResult> {
  try {
    const connectors = new ReplitConnectors();
    const resp = await connectors.proxy(
      "agentmail",
      `/v0/inboxes/${encodeURIComponent(AGENTMAIL_INBOX)}/messages/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: "تقرير تشخيص السيارة - لاقط",
          html: EMAIL_HTML,
          attachments: [
            { filename, content: pdfBuffer.toString("base64") },
          ],
        }),
      }
    );

    if (resp.status >= 200 && resp.status < 300) {
      const json: any = await resp.json().catch(() => ({}));
      return { success: true, messageId: json?.message_id };
    }

    const errText = await resp.text().catch(() => "");
    console.error(`[Email] AgentMail send failed: ${resp.status} ${errText}`);
    return { success: false, error: `AgentMail ${resp.status}: ${errText}` };
  } catch (err: any) {
    console.error("[Email] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}
