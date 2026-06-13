---
name: WhatsApp report send modes
description: Why the "Send via WhatsApp" report button has two modes and the hard platform constraint behind them.
---

# WhatsApp report-send modes

The "Send via WhatsApp" report button runs in one of two modes, toggled by a
single client flag (`WHATSAPP_REPORT_MODE` in `client/lib/whatsappMode.ts`):

- **trial** — opens the OS share sheet with the real PDF attached (reuses the
  existing `exportPdf` flow). The user's PERSONAL WhatsApp forwards the file to a
  contact they pick. No login, no credentials.
- **business** — server auto-sends the PDF from the WhatsApp Business number to
  the logged-in customer's own mobile via Meta Cloud API. Needs
  WHATSAPP_API_KEY + WHATSAPP_PHONE_NUMBER_ID.

**Why:** A personal WhatsApp account has NO official API to auto-send or
auto-attach a file. The only personal-account options are (a) the OS share sheet
(real attachment, but the user must pick the contact + tap send) or (b) a
`wa.me` deep link (can target a number but TEXT ONLY — no file attachment).
Programmatic background send-with-attachment requires the WhatsApp Business Cloud
API, and even then free-form documents only deliver inside the 24h
customer-service window; outside it a pre-approved template is required.

**How to apply:** For a quick personal-account demo keep trial mode. Flip to
business only after Cloud API creds for the business number are configured; the
server Business-API code stays in place either way.
