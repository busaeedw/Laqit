---
name: Email delivery via AgentMail connector
description: Why report emails go through the AgentMail Replit connector instead of SMTP, and the gotchas.
---

# Email delivery uses the AgentMail Replit connector

Report PDFs are emailed through the **AgentMail** Replit connector (`@replit/connectors-sdk`,
`connectors.proxy("agentmail", ...)`), NOT SMTP. The send service lives in `server/services/email.ts`.

**Why:** Both personal-mailbox SMTP paths were dead ends:
- Gmail App Password kept returning `535-5.7.8 BadCredentials` (2FA/App-Password setup never validated).
- Outlook/Hotmail returns `535 5.7.139 SmtpClientAuthentication is disabled` — Microsoft disabled basic SMTP auth on consumer mailboxes and it cannot be re-enabled.
The connector injects auth automatically and works inside the Express server process (dev and prod), not just the code sandbox.

**How to apply:**
- Send endpoint: `POST /v0/inboxes/{inboxId}/messages/send` with body `{ to, subject, html, attachments:[{filename, content }] }` where `content` is base64. (Note the `/send` suffix — plain `/messages` POST is not the send route.)
- FROM inbox is configured via the `AGENTMAIL_INBOX` env var (with an in-code default).
- AgentMail maintains a per-recipient **bounce block list**: a `403 MessageRejectedError ... (bounced)` on send means the recipient is bounce-blocked, not an auth failure.
- The legacy `EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS` SMTP env vars are no longer used by the sender.
