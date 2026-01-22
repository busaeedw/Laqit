# راصد قطع غيار السيارات (PartScope) - AI Car Parts Identification App

## Overview

PartScope is a React Native/Expo mobile application that uses AI to identify car parts from photographs. Users capture or upload images of car parts, and the app analyzes them using OpenAI's vision capabilities to detect the vehicle's make, model, year, and visible parts with pricing information in Saudi Riyals (SAR). The app is designed for Arabic-speaking users with full RTL (Right-to-Left) layout support.

Key features:
- Camera-based car part scanning with AI detection
- Car make/model/year selection
- Shopping cart for identified parts
- Subscription-based pricing tiers
- Order history tracking

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo/React Native)

**Structure**: The client code lives in `/client` with path alias `@/`. Components follow a modular pattern with themed variants (`ThemedText`, `ThemedView`) that adapt to dark/light modes.

**Navigation**: Uses React Navigation with a tab-based main interface and native stack for modal flows:
- `RootStackNavigator` - Top-level containing main tabs plus modal screens (Camera, Analysis, Results, Cart)
- `MainTabNavigator` - Bottom tabs with Home, Orders, Account, plus floating camera button
- Individual stack navigators per tab for nested navigation

**State Management**: 
- React Query (`@tanstack/react-query`) for server state and API calls
- React Context for cart state (`CartContext`)
- No Redux - keeps things simple with built-in React patterns

**Styling Approach**: Uses a centralized theme system in `/client/constants/theme.ts` with:
- Colors object with light/dark variants
- Spacing, BorderRadius, Typography constants
- Automotive-inspired palette (metallic silver, graphite black, engine red, AI scanning blue)

**Arabic/RTL Support**: Forced RTL layout via `I18nManager.forceRTL(true)` in App.tsx. Uses Cairo Google Font for Arabic typography.

### Backend (Express)

**Structure**: Server code in `/server` with Express.js API. Simple REST endpoints at `/api/*`.

**AI Integration**: OpenAI API via Replit AI Integrations for:
- Image analysis endpoint (`/api/analyze`) - Uses GPT-4 vision to identify car parts from photos
- Returns structured JSON with car info, detected parts, bounding boxes, and pricing

**Database**: PostgreSQL with Drizzle ORM. Schema in `/shared/schema.ts`. Currently has users table and chat-related tables for future features.

**Replit Integrations**: Pre-built utilities in `/server/replit_integrations/` for:
- Audio (voice chat, speech-to-text, text-to-speech)
- Image generation
- Chat with streaming
- Batch processing with rate limiting

### Shared Code

Located in `/shared` with alias `@shared/`. Contains:
- Database schema definitions (Drizzle tables)
- Zod validation schemas via `drizzle-zod`
- Type exports used by both client and server

### Build System

**Development**: 
- `npm run expo:dev` - Starts Expo dev server with Replit-specific environment variables
- `npm run server:dev` - Runs Express server with tsx

**Production**:
- `npm run expo:static:build` - Builds static web bundle
- `npm run server:build` - Bundles server with esbuild
- `npm run server:prod` - Runs production server

**Database**: `npm run db:push` - Pushes Drizzle schema to PostgreSQL

## External Dependencies

### AI Services
- **OpenAI API** - Used via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`) for vision-based part detection

### Database
- **PostgreSQL** - Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM** - Type-safe database queries and schema management

### Mobile/Expo
- **expo-camera** - Camera access for part photography
- **expo-image-picker** - Gallery image selection
- **expo-haptics** - Tactile feedback for UI interactions

### Key Libraries
- **React Navigation** - Native navigation with bottom tabs and stack navigators
- **React Native Reanimated** - Smooth animations for scanning effects and UI transitions
- **TanStack React Query** - Data fetching and caching

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key via Replit
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL via Replit
- `EXPO_PUBLIC_DOMAIN` - Domain for API calls from client
- `REPLIT_DEV_DOMAIN` - Replit development domain