// Email delivery via AgentMail's SMTP server.
//
// We send through AgentMail (smtp.agentmail.to) rather than a consumer mailbox
// because Gmail/Outlook block basic SMTP auth. The "From" address must match
// the AgentMail inbox, and the SMTP password is an AgentMail API key that is
// authorized for that inbox (stored in the AGENTMAIL_SMTP_PASSWORD secret).
import nodemailer from "nodemailer";

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// The AgentMail inbox that reports are sent FROM.
const AGENTMAIL_INBOX = process.env.AGENTMAIL_INBOX ?? "laqit@agentmail.to";
const AGENTMAIL_FROM_NAME = process.env.AGENTMAIL_FROM_NAME ?? "Laqit";
const SMTP_HOST = process.env.AGENTMAIL_SMTP_HOST ?? "smtp.agentmail.to";
const SMTP_PORT = Number(process.env.AGENTMAIL_SMTP_PORT ?? 465);

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

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const pass = process.env.AGENTMAIL_SMTP_PASSWORD;
  if (!pass) {
    console.error("[Email] AGENTMAIL_SMTP_PASSWORD is not set");
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: AGENTMAIL_INBOX, pass },
    });
  }
  return transporter;
}

export async function sendAnalysisPdfEmail(
  to: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<EmailSendResult> {
  try {
    const tx = getTransporter();
    if (!tx) {
      return { success: false, error: "Email transport not configured" };
    }

    const info = await tx.sendMail({
      from: `${AGENTMAIL_FROM_NAME} <${AGENTMAIL_INBOX}>`,
      to,
      subject: "تقرير تشخيص السيارة - لاقط",
      html: EMAIL_HTML,
      attachments: [{ filename, content: pdfBuffer }],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Email] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}
