export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendAnalysisPdfEmail(
  to: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<EmailSendResult> {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT ?? "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM ?? user ?? "noreply@laqit.app";

  if (!host || !user || !pass) {
    console.log(`[Email STUB] Would send PDF to: ${to}`);
    console.log(`  From: ${from}`);
    console.log(`  Subject: تقرير تشخيص السيارة - لاقط`);
    console.log(`  Attachment: ${filename} (${pdfBuffer.length} bytes)`);
    return { success: true, messageId: `mock_email_${Date.now()}` };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject: "تقرير تشخيص السيارة - لاقط",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E74F2;">لاقط — تقرير تشخيص السيارة</h2>
          <p>مرحباً،</p>
          <p>يرجى الاطلاع على تقرير تشخيص سيارتك المرفق أدناه.</p>
          <p>يحتوي التقرير على معلومات السيارة والقطع المكتشفة مع الأسعار التقديرية.</p>
          <hr />
          <p style="color: #888; font-size: 12px;">تم إرسال هذا البريد تلقائياً من منصة لاقط.</p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Email] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}
