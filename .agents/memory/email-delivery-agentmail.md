---
name: Email delivery via AgentMail SMTP
description: How report emails are sent (AgentMail SMTP), and the API-key scoping gotcha that controls which inbox you can send FROM.
---

# Email delivery uses AgentMail SMTP

Report PDFs are emailed via **AgentMail's SMTP server** (`nodemailer`, host `smtp.agentmail.to`,
port 465 implicit TLS). The send service is `server/services/email.ts`.

**Why SMTP (not the Replit AgentMail connector proxy):** the Replit AgentMail connection's API key
is **inbox-scoped** and could only ever reach one inbox, so it can't send from an arbitrary FROM
address. SMTP with an appropriately-scoped key is the working path. (Earlier consumer-mailbox SMTP
failed for a different reason: Gmail/Outlook block basic SMTP auth — AgentMail's SMTP does not.)

**AgentMail SMTP config:**
- Host `smtp.agentmail.to`, port `465` (implicit TLS) or `587` (STARTTLS).
- Username = the inbox email; the **FROM address must equal that inbox** or AgentMail returns
  `550 5.1.8 Sender address rejected`.
- Password = an **AgentMail API key** (NOT a separate mail password).
- Inbox configured via `AGENTMAIL_INBOX` env (in-code default), API key via `AGENTMAIL_SMTP_PASSWORD` secret.

**API-key scoping — the core gotcha:**
- AgentMail keys are **organization-level by default** (can send from ANY inbox in the org).
- Keys can also be **pod-scoped** or **inbox-scoped**; an inbox-scoped key ONLY authenticates+sends
  for its one inbox. Login still succeeds with a wrong-scope key, but the send is rejected at the
  `MAIL FROM` step with `550 5.1.8 Sender address rejected` — so a 550 sender-rejected (after a
  successful login) means the key's scope doesn't cover the FROM inbox, NOT bad credentials.
- Diagnose a key's scope quickly: `GET https://api.agentmail.to/v0/inboxes` with `Authorization: Bearer <key>`
  returns only the inbox(es) the key can see.
- To send from a specific inbox, use either an org-level key or a key scoped to that exact inbox.
