# Threat Model

## Project Overview

Laqit is a publicly deployed Arabic spare-parts RFQ platform with an Expo/React Native client and an Express + Drizzle + PostgreSQL backend. Customers create vehicle inspections with photos, the backend identifies parts with OpenAI, broadcasts RFQs to vendors over WhatsApp, ingests inbound quote messages through webhooks, and creates payment intents for accepted quotes.

Production scope for this scan is the public deployment at `https://laqit.app`. Per platform assumptions, transport security is provided by the platform and `NODE_ENV` is expected to be `production` in production deployments. Development-only helpers, local seed flows, and mockup sandbox behavior are out of scope unless they are reachable from the production server path.

## Assets

- **Customer account data** — customer IDs, names, mobile numbers, email addresses, city selection, and inspection history. Exposure enables impersonation, privacy loss, and unauthorized order manipulation.
- **Inspection and quote workflow data** — damage photos, requested parts, vendor quote images, OCR output, inspection numbers, quote status, and acceptance/payment state. This data determines who gets paid and what the customer sees.
- **Vendor business data** — vendor identities, staff mobile and WhatsApp numbers, role assignments, supported models, and locations. Exposure enables scraping, spoofing, and abuse of vendor channels.
- **Payment state and gateway references** — payment records, quote linkage, client secrets, and captured/paid state. Tampering can mark orders paid or trigger fulfillment without real payment.
- **Outbound messaging capability** — WhatsApp and SMS integrations are privileged server-side capabilities that can be abused to spam vendors/customers or to inject false workflow events.
- **AI-backed processing budget** — OpenAI-powered image analysis and OCR endpoints consume paid external capacity; abuse can create cost amplification and service degradation.
- **Application secrets** — database connection string and third-party API keys for OpenAI, WhatsApp, SMS, and payments.

## Trust Boundaries

- **Mobile/web client to API** — all `/api` routes are internet-reachable on the public deployment. The client is untrusted; customer IDs, inspection IDs, quote IDs, and status values from requests must not be trusted as proof of identity or authorization.
- **API to PostgreSQL** — the Express server has broad database access. Route-level authorization failures or injection at this layer expose all customer, vendor, quote, and payment records.
- **API to external AI/messaging/payment services** — the server can invoke OpenAI, WhatsApp, SMS, and Stripe-compatible APIs with privileged credentials. Requests crossing this boundary must be authenticated, scoped, and resilient to spoofed callbacks.
- **Public to authenticated customer boundary** — customer profile, inspection, quote, and payment operations must be restricted to the owning customer.
- **Public to privileged admin/vendor boundary** — vendor and vendor-user management is privileged business functionality and must not be reachable by arbitrary internet users.
- **External provider to webhook boundary** — inbound WhatsApp and payment webhook requests originate from third parties and must be cryptographically verified before changing application state.

## Scan Anchors

- **Production entry points:** `server/index.ts` and `server/routes.ts`; web app requests share the same Express origin as the API.
- **Highest-risk code areas:** `server/routes.ts` customer/vendor/inspection/quote/payment/webhook routes; `server/services/payment.ts`; `server/services/ocr.ts`; `server/services/whatsapp.ts`.
- **Public surfaces:** nearly all `/api/*` endpoints, including customer profile, inspection, vendor management, quote acceptance, payment creation, both webhooks, customer OTP endpoints, and the still-mounted legacy `/api/register`, `/api/login`, and `/api/inspections*` routes.
- **Authenticated/admin surfaces to verify carefully:** customer data access, quote acceptance/payment flow, vendor management, webhook-triggered state changes.
- **Production-reachable legacy surface:** `client/screens/OrderScreen.tsx` still targets the legacy `/api/inspections` route through `HomeStackNavigator`, so the old user/inspection flow remains part of the production attack surface.
- **Usually dev-only / lower-priority areas:** `server/seed.ts`, `server/replit_integrations/**`, Expo development proxy behavior in `server/index.ts`, and client-only presentation code unless it reveals a production trust assumption.

## Threat Categories

### Spoofing

This project currently treats client-supplied identifiers and inbound webhook payloads as identity signals. The system must require a real server-validated customer or admin session for protected routes, and it must verify webhook authenticity before trusting a claimed payment or WhatsApp sender.

### Tampering

Inspection status, quote acceptance, payment progression, vendor records, and outbound RFQ targeting all affect money and fulfillment. These workflow transitions must be authorized server-side, derived from trusted state, and protected from arbitrary client-supplied IDs or forged callback payloads.

### Information Disclosure

Customer profiles, inspection history, quote images, vendor contacts, and OCR-extracted pricing are sensitive business and personal data. API responses must be scoped to the caller’s authorized records only, and public routes must not expose vendor staff contact information or other broad database contents.

### Denial of Service

Public AI image-analysis and OCR-backed flows can trigger expensive third-party calls and heavy request bodies. Internet-facing endpoints that accept images or create outbound side effects must enforce authentication where appropriate, strict size/rate limits, bounded external-call behavior, and abuse controls on OTP/SMS or vendor-broadcast fan-out routes.

### Elevation of Privilege

The main privilege boundaries are anonymous user → customer, customer → other customer, and public user → vendor/admin capability. The backend must enforce ownership checks on every customer/inspection/quote/payment route and must never expose vendor-management operations without explicit privileged authorization.
