# مؤسسة خالد سالم باسنبل (PartScope) - AI Car Parts Identification App

## Overview

PartScope is a production-ready React Native/Expo mobile application that uses AI to identify car parts from photographs. Users capture or upload images of car parts, and the app analyzes them using OpenAI's vision capabilities to detect the vehicle's make, model, year, and visible parts. The app is designed for Arabic-speaking users with full RTL (Right-to-Left) layout support.

### App Status: Production Ready

Key features:
- **AI-powered car identification** - Upload or capture photos to identify car make/model/year
- **AI-powered parts detection** - Scan parts and get AI identification (up to 10 parts)
- **Manual car selection** - Choose from 6 major car brands with models and years
- **Manual parts entry** - Add parts manually with 30-character limit
- **Order review modal** - Review car info and parts list before submission
- **Subscription pricing** - 3 tiers (Basic: 9 SAR, Pro: 19 SAR, Workshop: 79 SAR)
- **Order history tracking** - View past orders (empty state when no orders)
- **Account management** - Profile, settings, and subscription management

## User Preferences

- Preferred communication style: Simple, everyday language
- UI Language: Arabic with RTL layout
- Design: Blue/white theme for primary actions, grey/black for secondary
- Upload buttons use blue theme with upload icon
- Camera/manual buttons use grey theme

## System Architecture

### Frontend (Expo/React Native)

**Structure**: The client code lives in `/client` with path alias `@/`. Components follow a modular pattern with themed variants (`ThemedText`, `ThemedView`) that adapt to dark/light modes.

**Screens**:
- `HomeScreen` - Landing page with hero card, feature highlights, and subscription CTA
- `OrderScreen` - 4-step workflow: car selection → parts scan → review → submit
- `OrdersScreen` - Order history with empty state
- `AccountScreen` - Profile and settings menu
- `PricingScreen` - 3 subscription tiers with selection
- `CarSelectionScreen` - Manual brand/model/year picker
- `CameraScreen` - Camera capture for car/parts photos

**Navigation**: Uses React Navigation with tab-based main interface:
- `RootStackNavigator` - Top-level containing main tabs plus modal screens
- `MainTabNavigator` - Bottom tabs: الرئيسية (Home), طلباتي (Orders), الحساب (Account)
- Floating "+" button for quick order access

**State Management**: 
- React Query (`@tanstack/react-query`) for server state and API calls
- React Context for cart state (`CartContext`)
- Local component state for form inputs

**Styling Approach**: Uses a centralized theme system in `/client/constants/theme.ts` with:
- Colors object with light/dark variants
- Spacing, BorderRadius, Typography constants
- Blue primary color (#1E74F2) for main actions
- Cairo Google Font for Arabic typography

**Arabic/RTL Support**: Forced RTL layout via `I18nManager.forceRTL(true)` in App.tsx.

### Backend (Express)

**Structure**: Server code in `/server` with Express.js API.

**API Endpoints**:
- `POST /api/identify-car` - AI car identification from image
- `POST /api/analyze` - AI parts detection from image

**AI Integration**: OpenAI API via Replit AI Integrations for GPT-4 vision capabilities.

**Database**: PostgreSQL with Drizzle ORM. Schema in `/shared/schema.ts`.

Full Laqit RFQ schema is implemented alongside the original tables. New tables:
- `cities` — city master data
- `customers` — customer accounts with city FK and E.164 mobile
- `vendors` / `vendor_users` — vendor companies and their staff (WhatsApp-primary partial unique index)
- `car_makes` / `car_models` — car catalog
- `vendor_locations` / `vendor_supported_models` — vendor coverage and compatibility
- `laqit_inspections` — full inspection table with inspection_no, status enum, city/model FKs
- `inspection_media` / `inspection_parts` — photos and parts per inspection
- `rfq_documents` / `rfq_recipients` — generated PDFs and delivery audit log
- `whatsapp_messages` — inbound/outbound WhatsApp message log
- `quotes` — vendor quotes with OCR-extracted total amount
- `payments` — payment records per accepted quote
- `notifications` — multi-channel notification log
- `audit_log` — general actor/entity audit trail

PostgreSQL enum types: `inspection_status`, `delivery_status`, `message_direction`, `quote_status`, `payment_status`, `user_role`, `user_status`, `vendor_status`, `customer_status`, `media_type`, `part_source`, `notification_channel`, `notification_status`

### Build System

**Development**: 
- `npm run expo:dev` - Starts Expo dev server (port 8081)
- `npm run server:dev` - Runs Express server (port 5000)

**Production**:
- `npm run expo:static:build` - Builds static web bundle
- `npm run server:build` - Bundles server with esbuild
- `npm run server:prod` - Runs production server

**Database**: `npm run db:push` - Pushes Drizzle schema to PostgreSQL

## Testing

**TestIDs for automated testing**:
- `button-new-order` - New order button on home
- `button-upload-car-image` - Upload image for car identification
- `button-capture-car-image` - Capture photo for car identification
- `button-manual-car-select` - Open manual car selection
- `button-upload-parts-image` - Upload image for parts
- `button-capture-parts-image` - Capture photo for parts
- `button-review-order` - Open review modal
- `button-pricing-cta` - CTA to pricing screen

## External Dependencies

### AI Services
- **OpenAI API** - Used via Replit AI Integrations for vision-based identification

### Database
- **PostgreSQL** - Primary database via `DATABASE_URL`
- **Drizzle ORM** - Type-safe database queries

### Mobile/Expo
- **expo-camera** - Camera access for photography
- **expo-image-picker** - Gallery image selection
- **expo-haptics** - Tactile feedback for UI interactions
- **expo-image-manipulator** - Image resizing and base64 conversion

### Key Libraries
- **React Navigation** - Native navigation with bottom tabs and stack navigators
- **React Native Reanimated** - Smooth animations for UI transitions
- **TanStack React Query** - Data fetching and caching
- **Cairo Google Font** - Arabic typography

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key via Replit
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL via Replit
- `EXPO_PUBLIC_DOMAIN` - Domain for API calls from client
- `REPLIT_DEV_DOMAIN` - Replit development domain

## Recent Updates

- Added testIDs to all key interactive elements for automated testing
- Polished UI with consistent blue/white theme for upload buttons
- Grey/black theme for camera and manual selection buttons
- All 4 workflow steps implemented in OrderScreen
- Review modal shows app logo, car info, and numbered parts list
- Empty states implemented for Orders screen
- Pricing screen with 3 subscription tiers
- Production-ready error handling with ErrorBoundary
