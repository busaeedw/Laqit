// Controls how the "إرسال عبر واتساب" (Send via WhatsApp) report button behaves.
//
// "trial"    — Opens the device share sheet with the actual report PDF attached,
//              so the user's PERSONAL WhatsApp can forward it to any contact
//              (e.g. another personal number). No login or WhatsApp Business
//              credentials are required. Good for testing the flow.
//
// "business" — Posts to the server, which automatically sends the PDF from the
//              WhatsApp Business number (+966503401307) to the logged-in
//              customer's own mobile. Requires WHATSAPP_API_KEY and
//              WHATSAPP_PHONE_NUMBER_ID to be configured on the server.
//
// Flip this to "business" once the WhatsApp Cloud API credentials are set up.
// The server-side Business API code remains in place and ready either way.
export const WHATSAPP_REPORT_MODE: "trial" | "business" = "trial";
