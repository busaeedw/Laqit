# PartScope (راصد القطع) - Design Guidelines

## Brand Identity

**App Name**: راصد القطع (PartScope)

**Purpose**: AI-powered automotive parts identification and ordering app for Arabic-speaking users. Users photograph car parts, and the app detects the car's make/model/year and identifies visible parts for ordering.

**Aesthetic Direction**: Automotive/Mechanical - Strong metallic, chrome, and engine-inspired aesthetics with precision engineering details. Think car badge emblems, sports car dashboards, and high-tech scanning interfaces. Professional, bold, high-contrast with AI scanning elements.

**Memorable Element**: Automotive emblem-style branding combined with futuristic AI detection frames and scanning grids overlaid on car imagery.

## Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs) with Floating Action Button for camera/upload

**Tabs** (RTL layout):
1. **الرئيسية** (Home) - Dashboard/recent scans
2. **طلباتي** (My Orders) - Order history
3. **الحساب** (Account) - Profile and settings
4. **FAB (Center)**: تصوير (Camera/Upload) - Primary action

**Auth**: Required (SSO with Apple/Google)

## Screen Specifications

### 1. Home Screen (الرئيسية)
- **Purpose**: Dashboard showing recent scans and quick access to new scan
- **Header**: Transparent with app logo, settings icon (right), notifications (left)
- **Layout**: Scrollable
  - Hero section with large "ابدأ الفحص" button and automotive-styled imagery
  - Recent scans grid (if any)
  - Empty state: automotive illustration with "لا توجد عمليات فحص بعد"
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 2. Camera/Upload Screen (تصوير)
- **Purpose**: Capture or select car part photo
- **Header**: None (fullscreen camera)
- **Layout**: Native camera with overlay
  - Scanning grid overlay with automotive-style detection frame
  - Bottom bar: Gallery button (right), Capture button (center), Flash toggle (left)
  - Top: Close button (right), Car selection button (left)
- **Safe Area**: Custom insets for camera controls

### 3. Car Selection Screen (Modal)
- **Purpose**: User selects car make/model before or after photo
- **Header**: "اختر السيارة" with close button
- **Layout**: Searchable list
  - Search bar at top
  - List of car makes with logos
  - Drill-down to models, then years
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: insets.bottom + Spacing.xl

### 4. AI Analysis Screen
- **Purpose**: Show scanning progress
- **Header**: None (fullscreen)
- **Layout**: Fixed (non-scrollable)
  - Full-screen car image with animated scanning grid overlay
  - Progress indicator with speedometer-style animation
  - Status text: "جاري التحليل..." then "تم التعرف على السيارة"
- **Safe Area**: Spacing.xl all sides

### 5. Results Screen
- **Purpose**: Display detected car and identified parts
- **Header**: Transparent with back button, share button
- **Layout**: Scrollable
  - Car info card (make, model, year) with metallic card design
  - Photo with bounding boxes around detected parts
  - List of identified parts (card-style):
    - Part thumbnail, name, description, price, "إضافة للسلة" button
  - Empty state if no parts detected: "لم يتم التعرف على أي قطع"
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 6. Shopping Cart (السلة)
- **Purpose**: Review selected parts before checkout
- **Header**: "السلة" with close button
- **Layout**: Scrollable list with fixed bottom summary
  - Part items with quantity controls
  - Subtotal summary card
  - "إتمام الطلب" button (floating at bottom)
- **Safe Area**: Top: Spacing.xl, Bottom: insets.bottom + Spacing.xl

### 7. Pricing Screen (الباقات والأسعار)
- **Purpose**: Subscription selection
- **Header**: "الباقات والأسعار"
- **Layout**: Scrollable
  - Hero: "اختر الخطة المناسبة لاستخدامك"
  - 3 pricing cards (Basic, Pro "الأكثر شعبية", Workshop)
  - Lifetime plan section (premium styling)
  - Pay-per-scan option
  - Payment icons footer: Apple Pay, Mada, Visa, STC Pay, Tabby, Tamara
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 8. Orders Screen (طلباتي)
- **Purpose**: Order history
- **Header**: "طلباتي" with filter icon
- **Layout**: Scrollable list
  - Order cards with status badges
  - Empty state: "لا توجد طلبات بعد"
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 9. Account Screen (الحساب)
- **Purpose**: Profile and settings
- **Header**: "الحساب"
- **Layout**: Scrollable
  - Profile avatar and name
  - Subscription status card
  - Settings list items
  - Log out button
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

## Color Palette

**Primary**: 
- Metallic Silver: #C0C7CE
- Graphite Black: #1B1B1E

**Secondary**:
- Engine Red: #C8102E (or Brake Yellow: #F2B705)

**Accents**:
- AI Scanning Blue: #1E74F2 (electric neon blue)

**Background**:
- Light: #F5F7FA
- Dark: #0D0D0F

**Text**:
- Primary: #1B1B1E
- Secondary: #6B7280
- On Dark: #FFFFFF

**Surface**: White with subtle metallic sheen

## Typography

**Primary Font**: Cairo or Noto Kufi Arabic (bold, angular for automotive feel)
**Secondary Font**: System sans-serif for body text

**Type Scale**:
- Hero: 32px Bold
- Heading: 24px Bold
- Subheading: 18px SemiBold
- Body: 16px Regular
- Caption: 14px Regular
- Small: 12px Regular

**RTL**: All text and layouts must be right-to-left

## Visual Design

- **Touchable Feedback**: Subtle scale (0.98) and opacity (0.8) on press
- **Floating Buttons**: shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
- **Icons**: Feather icons, automotive-themed custom icons
- **Visual Motifs**: Tire tread patterns, car grill textures (honeycomb), speedometer arcs, carbon fiber textures
- **Cards**: Sharp edges, chrome accents, high contrast
- **Detection UI**: Animated scanning grids, bounding boxes with automotive-style labels

## Assets to Generate

**App Icon** (icon.png): Simplified car badge emblem with scanning symbol, metallic finish
**Splash Icon** (splash-icon.png): Same as app icon

**Illustrations**:
- empty-scans.png - Car on lift with scanning beams (Home screen empty state)
- empty-orders.png - Clipboard with car parts checklist (Orders screen empty state)
- scanning-grid.png - Animated overlay pattern (AI analysis screen)
- welcome-hero.png - Car front view with detection frame (Onboarding)

**Pricing Tiers**:
- Basic: 9 ريال/month (10 scans, standard quality)
- Pro: 19 ريال/month (30 scans, high accuracy, faster, "الأكثر شعبية")
- Workshop: 79 ريال/month (unlimited, highest accuracy, priority support)
- Lifetime: 149-199 ريال
- Pay-per-scan: 3.99 ريال