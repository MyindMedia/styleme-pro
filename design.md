# StyleMe Pro - Mobile App Interface Design

## Design Philosophy

StyleMe Pro follows the **$50k MRR Framework** principles:
- **High-Intent Input**: Photo scanning of clothing items
- **Premium Insight**: AI-powered outfit recommendations and closet valuation
- **Simple Interface**: One-tap actions, minimalist luxury aesthetic
- **Recurring Behavior Loop**: Daily outfit logging and styling suggestions

## Screen List

### 1. Onboarding Flow
- **Welcome Screen** - App introduction with value proposition
- **Digital Twin Setup** - Full-body photo capture for virtual try-on calibration
- **First Scan Tutorial** - Guide to scanning first clothing item

### 2. Main Tab Navigation
- **Closet Tab** (Home) - Digital closet grid view
- **Style Me Tab** - AI outfit generator
- **Fit Tracker Tab** - Daily wear logging and analytics
- **Community Tab** - Social look board
- **Profile Tab** - Settings and account

### 3. Detail Screens
- **Item Detail Screen** - Single clothing item view with metadata
- **Outfit Detail Screen** - Generated outfit with VTO preview
- **Add Item Screen** - Camera/gallery scan interface
- **Analytics Dashboard** - Cost-per-wear and closet insights

## Primary Content and Functionality

### Closet Tab (Home)
- **Grid Layout**: 3-column masonry grid of clothing items
- **Category Filter Pills**: All, Tops, Bottoms, Shoes, Accessories, Outerwear
- **Floating Action Button**: Quick scan (+) button
- **Search Bar**: Find items by color, brand, or tag
- **Sort Options**: Recent, Most Worn, Value (High to Low)

### Style Me Tab
- **Mood Selector**: Horizontal scroll of style moods
  - Old Money, Streetwear, Corporate Chic, Casual, Date Night, Athleisure
- **Reference Upload**: Upload inspiration photo option
- **Generated Looks**: 3 AI-generated outfit cards
- **Virtual Try-On Preview**: Outfit rendered on user's digital twin
- **Save Look Button**: Add to saved outfits collection

### Fit Tracker Tab
- **Calendar View**: Monthly calendar with outfit dots
- **Today's Outfit**: Quick log with one-tap item selection
- **Stats Cards**:
  - Total Items Worn This Month
  - Most Worn Item
  - Cost-Per-Wear Leader
  - Items Not Worn (90+ days)
- **Quarterly Recap**: Scrollable insights section

### Community Tab
- **Style of the Day**: Featured hero card at top
- **Masonry Feed**: User-submitted outfit photos
- **Heart/Save Interactions**: Social engagement
- **Recreate Look**: AI suggests similar items from user's closet

### Profile Tab
- **Digital Twin Preview**: User's body scan image
- **Closet Stats**: Total items, total value, categories breakdown
- **Settings**: Notifications, theme, account
- **Pro Subscription**: Upgrade CTA for free users

## Key User Flows

### Flow 1: Add New Item to Closet
1. User taps (+) FAB on Closet tab
2. Camera opens with "Flat Lay" guide overlay
3. User captures photo of clothing item
4. AI auto-removes background and suggests tags
5. User confirms/edits: Category, Color, Brand, Purchase Price
6. Item saved to closet with success haptic

### Flow 2: Get Styled Outfit
1. User navigates to Style Me tab
2. Selects mood (e.g., "Old Money")
3. Optionally uploads reference image
4. Taps "Generate Looks" button
5. AI creates 3 outfit combinations from user's closet
6. User swipes through looks, views VTO preview
7. Saves favorite look or regenerates

### Flow 3: Log Daily Outfit
1. User opens Fit Tracker tab
2. Taps "Log Today's Outfit"
3. Selects items worn from closet grid
4. Confirms outfit with one tap
5. Option to "Share to Community" toggle
6. Stats update automatically

### Flow 4: Browse Community
1. User opens Community tab
2. Views Style of the Day hero
3. Scrolls masonry feed of user looks
4. Taps heart to like, bookmark to save
5. Taps "Recreate" to see matching items from own closet

## Color Choices

### Primary Palette (High-Fashion Minimalist)
- **Background**: `#FFFFFF` (light) / `#0A0A0A` (dark)
- **Surface**: `#F8F8F8` (light) / `#1A1A1A` (dark)
- **Foreground**: `#0A0A0A` (light) / `#FAFAFA` (dark)
- **Muted**: `#6B6B6B` (light) / `#8A8A8A` (dark)
- **Border**: `#E5E5E5` (light) / `#2A2A2A` (dark)

### Accent Colors
- **Primary/Tint**: `#000000` (light) / `#FFFFFF` (dark) - Monochrome luxury
- **Success**: `#10B981` - Item added, outfit saved
- **Warning**: `#F59E0B` - Items not worn alerts
- **Error**: `#EF4444` - Validation errors

### Category Colors (Subtle Tints)
- Tops: `#E8F4FD` (soft blue)
- Bottoms: `#FEF3E8` (soft orange)
- Shoes: `#F3E8FE` (soft purple)
- Accessories: `#E8FEF3` (soft mint)
- Outerwear: `#FEE8E8` (soft rose)

## Typography

- **Display**: SF Pro Display Bold, 32px - Screen titles
- **Headline**: SF Pro Display Semibold, 24px - Section headers
- **Body**: SF Pro Text Regular, 16px - Primary content
- **Caption**: SF Pro Text Regular, 14px - Secondary text, metadata
- **Micro**: SF Pro Text Medium, 12px - Tags, badges

## Component Patterns

### Clothing Item Card
- Square aspect ratio with rounded corners (12px)
- Image fills card with subtle shadow
- Category badge in top-left corner
- Brand name overlay at bottom (on hover/press)

### Outfit Card
- Vertical stack of 3-4 item thumbnails
- "Try On" button overlay
- Mood tag pill at top
- Save/Share action buttons

### Stat Card
- Rounded rectangle with surface background
- Large number display (32px bold)
- Label below (14px muted)
- Optional trend indicator arrow

## Interaction Patterns

### Press Feedback
- Cards: Scale 0.98 + opacity 0.9
- Buttons: Scale 0.97 + haptic light
- Icons: Opacity 0.6

### Gestures
- Swipe left on item card: Quick delete
- Long press on item: Multi-select mode
- Pull to refresh on all lists

### Animations
- Card entrance: Fade in + slide up (200ms)
- Tab switch: Cross-fade (150ms)
- Modal: Slide up from bottom (300ms)

## Accessibility

- Minimum touch target: 44x44px
- Color contrast ratio: 4.5:1 minimum
- VoiceOver labels on all interactive elements
- Reduce motion support for animations
