---
name: Twilio SMS OTP delivery
description: How login/registration OTP SMS is delivered, the Twilio trial gotcha, and the production-safety rule for provider stubs.
---

# Twilio SMS OTP delivery

OTP SMS for customer login/registration is delivered through the **Twilio
Messages API** (REST, HTTP Basic auth: Account SID = username, Auth Token =
password). Secrets used: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`. The sender may be a phone number *or* a Messaging
Service SID (`MG...`).

## Gotcha: Twilio Trial accounts block unverified destinations
A Trial account **rejects sends to any unverified number** with error
**21608**, synchronously, at message-creation time — so no message record is
even created and the messages list stays empty. Only "Verified Caller IDs"
are reachable.
**How to apply:** to deliver OTPs to real customer numbers (e.g. KSA +966),
the Twilio account must be **upgraded to a paid plan** (and a sender capable
of delivering to the destination country). A 502 + Arabic error on a real
number almost always means "still on trial / number unverified", not a code
bug.

## Rule: provider stub fallbacks must be dev-gated
When messaging/payment service credentials are missing, the no-creds stub
fallback must be gated to `NODE_ENV !== 'production'`.
**Why:** in production a "log it and return success" stub both (a) leaks the
OTP code + phone number into logs and (b) tells the user a code was sent when
nothing was delivered (false success). In production, missing creds must
return failure and must NOT log the message body.
**How to apply:** same pattern should cover other stubs (whatsapp, payment).

## On-failure OTP rollback
On send failure the route calls `clearOtp(mobile)` so the user can retry
immediately instead of waiting out the 60s resend cooldown. The send path has
a bounded (~10s) timeout, which keeps the "delayed failure clears a newer
OTP" race window small.
