# Laqit — Arabic RFQ Platform for Car Spare Parts

## Overview

Laqit is a production-grade Arabic RTL React Native/Expo mobile app (with Express backend) for car spare parts sourcing via RFQ (Request for Quotation). Customers photograph their car damage, get AI-identified parts, and receive quotes from vendors via WhatsApp. The platform manages the full end-to-end workflow.

**Full workflow:**
Customer inspection creation → AI part identification → RFQ broadcast to vendors (WhatsApp) → Inbound quote intake via WhatsApp webhook → OCR price extraction (GPT-4o Vision) → Customer quote review & acceptance → Payment → Vendor post-payment notification

### App Status: Production-Ready (Stub External Services)

## User Preferences

- UI Language: Arabic with RTL layout (all text in Arabic)
- Design: Blue (#1E74F2) primary, Cairo font family
- No emojis in UI
- Mobile-first (iOS 26 Liquid Glass aesthetic)

## System Architecture

### Frontend (Expo/React Native)
- **Entry**: `client/App.tsx` → `RootStackNavigator`
- **Navigation**: Tab navigator (HomeTab, ScanTab/+, OrdersTab, AccountTab) with full stack navigators
- **Key screens**:
  - `HomeScreen` — hero card with "طلب جديد" button → navigates to `NewInspection`
  - `NewInspectionScreen` — 4-step wizard: Car → Photos → AI Parts → Review & Submit
  - `InspectionsScreen` — list of customer inspections with status badges
  - `InspectionDetailScreen` — timeline + parts + quotes CTA
  - `QuotesListScreen` — vendor quotes with image modal + accept button
  - `AccountScreen` — login/register (with city selection) + profile

### Backend (Express + Drizzle ORM + PostgreSQL)
- **Port**: 5000
- **Entry**: `server/index.ts` → `server/routes.ts`
- **Database**: PostgreSQL via `shared/schema.ts` (22 tables)

### External Service Stubs (production-ready integration points)
All stubs log in development; wire real providers via env vars:
- `server/services/whatsapp.ts` — `sendWhatsAppMessage()` uses `WHATSAPP_API_KEY` + `WHATSAPP_PHONE_NUMBER_ID`
- `server/services/sms.ts` — `sendSms()` uses `SMS_API_KEY`
- `server/services/payment.ts` — `createPaymentIntent()` uses `PAYMENT_SECRET_KEY` (Stripe-compatible)
- `server/services/ocr.ts` — `extractTotalPrice()` uses OpenAI GPT-4o Vision (real, no stub)

## Database Schema (22 tables)

### Reference data
- `cities` — Saudi cities (10 seeded)
- `car_makes` — 14 car brands (seeded)
- `car_models` — 77 models (seeded)

### Customers & Vendors
- `customers` — customer accounts (mobile_e164, email, city_id)
- `vendors` — vendor businesses
- `vendor_users` — vendor staff with WhatsApp numbers
- `vendor_locations` — vendor cities
- `vendor_supported_models` — which car models each vendor serves

### Inspection workflow
- `laqit_inspections` — core inspection record (INS-YYYY-NNNNNN format, status machine)
- `inspection_media` — car_photo / damage_photo URLs
- `inspection_parts` — AI-suggested or user-added parts
- `rfq_documents` — generated PDF (optional)
- `rfq_recipients` — which vendors received the RFQ

### Quote & payment
- `whatsapp_messages` — inbound + outbound messages logged
- `quotes` — vendor quotes with OCR-extracted total_amount
- `payments` — payment records (Stripe-compatible)
- `notifications` — SMS/WhatsApp notifications log

### Legacy (backward compat)
- `users` / `inspections` / `conversations` / `messages`

## API Endpoints

### Reference
- `GET /api/cities`
- `GET /api/car-makes`
- `GET /api/car-models/:makeId`

### Customers
- `POST /api/customers/register` — { fullName, mobileE164, email, cityId }
- `POST /api/customers/login` — { mobileE164 }
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`

### Inspections
- `POST /api/laqit-inspections` — { customerId, carModelId, carYear }
- `GET /api/laqit-inspections/customer/:customerId`
- `GET /api/laqit-inspections/:id`
- `POST /api/laqit-inspections/:id/media` — { fileUrl, mediaType }
- `POST /api/laqit-inspections/:id/parts` — { parts: [{partName, quantity, source}] }
- `PATCH /api/laqit-inspections/:id/status`
- `POST /api/laqit-inspections/:id/submit` — triggers RFQ broadcast

### Quotes
- `GET /api/laqit-inspections/:id/quotes`
- `POST /api/laqit-inspections/:id/quotes/:quoteId/accept`
- `GET /api/quotes/:quoteId`

### Payments
- `POST /api/payments` — { inspectionId, quoteId, customerId }

### Vendors (admin)
- `GET /api/vendors`
- `POST /api/vendors`
- `GET /api/vendor-users`
- `POST /api/vendor-users`

### Webhooks
- `POST /api/webhooks/whatsapp` — inbound WhatsApp, OCR, quote creation, SMS notification
- `POST /api/webhooks/payment` — payment captured, vendor WhatsApp notification

### Legacy
- `POST /api/register` / `POST /api/login` (users table)
- `POST /api/analyze` — AI car/part analysis

## Seeded Data

Run `npx tsx server/seed.ts` to seed:
- 10 Saudi cities
- 14 car brands, 77 models
- 4 sample vendors (2 Riyadh, 1 Jeddah, 1 Dammam) with WhatsApp numbers and supported models

## Navigation Structure

```
RootStackNavigator
├── Main → MainTabNavigator
│     ├── HomeTab → HomeStackNavigator (Home, Order, Pricing)
│     ├── ScanTab → floating + → navigates to NewInspection
│     ├── OrdersTab → OrdersStackNavigator (Inspections)
│     └── AccountTab → AccountStackNavigator (Account)
├── Camera (fullscreen modal)
├── CarSelection (modal)
├── Analysis (fullscreen modal)
├── Results
├── Cart (modal)
├── Pricing
├── Expert (modal)
├── NewInspection ← new
├── InspectionDetail ← new
└── QuotesList ← new
```

## UserContext Fields
- `id` — customer UUID (same as customerId)
- `name` — full name
- `mobile` — E.164 mobile
- `email`
- `customerId` — UUID in customers table
- `cityId` — UUID in cities table

## Environment Variables Required for Production
- `DATABASE_URL` — PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI (already integrated)
- `WHATSAPP_API_KEY` + `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Business API
- `SMS_API_KEY` — SMS provider (Unifonic or similar)
- `PAYMENT_SECRET_KEY` — Stripe secret key
