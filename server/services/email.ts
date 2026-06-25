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

const EMAIL_DEFAULTS: Record<"ar" | "en", { subject: string; bodyLine: string; footer: string; detail: string; greeting: string; title: string; dir: string }> = {
  ar: {
    subject: "تقرير تشخيص السيارة - لاقط",
    title: "لاقط — تقرير تشخيص السيارة",
    greeting: "مرحباً،",
    bodyLine: "يرجى الاطلاع على تقرير تشخيص سيارتك المرفق أدناه.",
    detail: "يحتوي التقرير على معلومات السيارة والقطع المكتشفة مع الأسعار التقديرية.",
    footer: "تم إرسال هذا البريد تلقائياً من منصة لاقط.",
    dir: "rtl",
  },
  en: {
    subject: "Car Diagnostic Report - Laqit",
    title: "Laqit — Car Diagnostic Report",
    greeting: "Hello,",
    bodyLine: "Please find your car diagnostic report attached below.",
    detail: "The report contains your vehicle information and the detected parts with estimated prices.",
    footer: "This email was sent automatically by the Laqit platform.",
    dir: "ltr",
  },
};

function buildEmailHtml(locale: "ar" | "en", bodyLineOverride?: string, detailOverride?: string): string {
  const d = EMAIL_DEFAULTS[locale];
  const body = bodyLineOverride ?? d.bodyLine;
  const detail = detailOverride ?? d.detail;
  return `
  <div dir="${d.dir}" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1E74F2;">${d.title}</h2>
    <p>${d.greeting}</p>
    <p>${body}</p>
    <p>${detail}</p>
    <hr />
    <p style="color: #888; font-size: 12px;">${d.footer}</p>
  </div>
`;
}

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

export async function sendCustomerExportEmail(
  to: string | string[],
  csvContent: string,
  filename: string,
): Promise<EmailSendResult> {
  try {
    const tx = getTransporter();
    if (!tx) {
      return { success: false, error: "Email transport not configured" };
    }

    const subject = "تقرير قائمة العملاء - لاقط";
    const now = new Date().toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Riyadh",
    });
    const html = `
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1E74F2;">لاقط — تقرير قائمة العملاء</h2>
    <p>مرحباً،</p>
    <p>يرجى الاطلاع على قائمة العملاء المرفقة بتاريخ ${now}.</p>
    <p>يحتوي التقرير على بيانات جميع العملاء المسجلين في المنصة.</p>
    <hr />
    <p style="color: #888; font-size: 12px;">تم إرسال هذا البريد تلقائياً من منصة لاقط.</p>
  </div>
`;

    const info = await tx.sendMail({
      from: `${AGENTMAIL_FROM_NAME} <${AGENTMAIL_INBOX}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      attachments: [
        {
          filename,
          content: Buffer.from(csvContent, "utf-8"),
          contentType: "text/csv; charset=utf-8",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Email] Customer export send error:", err?.message);
    return { success: false, error: err?.message };
  }
}

export async function sendAnalysisPdfEmail(
  to: string,
  pdfBuffer: Buffer,
  filename: string,
  locale: string = "ar",
  bodyLineOverride?: string,
  detailOverride?: string
): Promise<EmailSendResult> {
  try {
    const tx = getTransporter();
    if (!tx) {
      return { success: false, error: "Email transport not configured" };
    }

    const safeLocale: "ar" | "en" = locale === "en" ? "en" : "ar";
    const subject = EMAIL_DEFAULTS[safeLocale].subject;
    const html = buildEmailHtml(safeLocale, bodyLineOverride, detailOverride);
    const info = await tx.sendMail({
      from: `${AGENTMAIL_FROM_NAME} <${AGENTMAIL_INBOX}>`,
      to,
      subject,
      html,
      attachments: [{ filename, content: pdfBuffer }],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Email] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}
