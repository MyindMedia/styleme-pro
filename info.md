# FitCheck - App Documentation

> **AI-Powered Wardrobe & Outfit Planning App**
> 
> Version: 1.0.0 | Last Updated: January 12, 2026

---

## Overview

FitCheck is a mobile application built with Expo and React Native that helps users manage their wardrobe, plan outfits, and make smarter fashion decisions. The app leverages AI for clothing recognition, outfit suggestions, and style recommendations.

### Key Value Propositions

| Feature | Description |
|---------|-------------|
| **Smart Closet** | Digital wardrobe with detailed categorization by type, occasion, season, and brand |
| **AI Recognition** | Automatic item identification via image analysis or product URL scraping |
| **Outfit Generation** | AI-powered outfit suggestions based on mood, occasion, and weather |
| **Wishlist Blend** | See how potential purchases would match your existing wardrobe |
| **Trip Packing** | Smart packing lists based on destination weather and trip duration |
| **Style Tracking** | Calendar-based outfit logging with cost-per-wear analytics |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo SDK 54 with React Native 0.81 |
| **Language** | TypeScript 5.9 |
| **Routing** | Expo Router 6 (file-based routing) |
| **Styling** | NativeWind 4 (Tailwind CSS for React Native) |
| **State** | React Context + AsyncStorage for local persistence |
| **Backend** | Express + tRPC for type-safe API |
| **Database** | Supabase (PostgreSQL) for cloud sync |
| **AI/LLM** | Built-in Manus Forge API for image recognition and outfit suggestions |
| **Animations** | react-native-reanimated 4.x |

---

## Project Structure

```
fitcheck/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Closet (Home) screen
│   │   ├── style.tsx             # Style Me / Outfit generation
│   │   ├── tracker.tsx           # Fit Tracker calendar
│   │   ├── community.tsx         # Community Look Board
│   │   └── profile.tsx           # User profile & settings
│   ├── add-item.tsx              # Add clothing item (with AI recognition)
│   ├── item/[id].tsx             # Item detail screen
│   ├── shuffle.tsx               # Outfit randomizer
│   ├── wishlist.tsx              # Wishlist with blend feature
│   ├── packing.tsx               # Trip packing list
│   └── _layout.tsx               # Root layout with providers
│
├── components/                   # Reusable UI components
│   ├── screen-container.tsx      # SafeArea wrapper for all screens
│   ├── themed-view.tsx           # Theme-aware view component
│   ├── haptic-tab.tsx            # Tab bar with haptic feedback
│   └── ui/
│       └── icon-symbol.tsx       # Icon mapping (SF Symbols → Material)
│
├── lib/                          # Core utilities
│   ├── storage.ts                # AsyncStorage helpers + data types
│   ├── supabase.ts               # Supabase client configuration
│   ├── trpc.ts                   # tRPC client for API calls
│   ├── utils.ts                  # Utility functions (cn, etc.)
│   └── theme-provider.tsx        # Dark/light mode context
│
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts               # Authentication state
│   ├── use-colors.ts             # Theme colors hook
│   └── use-color-scheme.ts       # System theme detection
│
├── server/                       # Backend (Express + tRPC)
│   ├── routers.ts                # API routes (clothing recognition, etc.)
│   ├── db.ts                     # Database query helpers
│   ├── storage.ts                # S3 file storage helpers
│   └── _core/                    # Framework internals (don't modify)
│       ├── llm.ts                # AI/LLM integration
│       └── ...
│
├── drizzle/                      # Database schema (Drizzle ORM)
│   ├── schema.ts                 # Table definitions
│   └── relations.ts              # Table relationships
│
├── supabase/                     # Supabase configuration
│   └── migrations/               # SQL migration files
│
├── assets/                       # Static assets
│   └── images/                   # App icons, splash screens
│
├── constants/                    # App constants
│   └── theme.ts                  # Color palette exports
│
├── theme.config.js               # Single source of truth for colors
├── tailwind.config.js            # Tailwind/NativeWind configuration
├── app.config.ts                 # Expo app configuration
└── package.json                  # Dependencies and scripts
```

---

## Features Detail

### 1. Digital Closet (Home Screen)

**File:** `app/(tabs)/index.tsx`

The main screen displays all clothing items in a grid view with filtering by category. Features include:

- Category filter pills (All, Tops, Bottoms, Shoes, etc.)
- Quick access to Shuffle and Wishlist
- Floating action button to add new items
- "STYLE" watermark branding element
- Pull-to-refresh functionality

### 2. Smart Item Recognition

**Files:** `app/add-item.tsx`, `server/routers.ts`

Three methods for adding items:

| Method | How It Works |
|--------|--------------|
| **Camera/Gallery** | User takes photo → AI analyzes image → Extracts brand, type, color, price, occasions |
| **Product URL** | User pastes store link → Server fetches page → LLM extracts product data |
| **Manual Entry** | Traditional form with dropdowns and inputs |

The AI recognition uses the built-in LLM with vision capabilities to identify:
- Brand name (if visible)
- Clothing category and specific type
- Primary and secondary colors
- Material estimation
- Style category (casual, business, athletic, etc.)
- Suitable occasions and seasons
- Estimated retail price

### 3. Outfit Generation (Style Me)

**File:** `app/(tabs)/style.tsx`

AI-powered outfit suggestions based on:
- Selected mood (Confident, Relaxed, Creative, Professional, Romantic)
- Occasion (Work, Casual, Date Night, Party, Sport)
- Items in user's closet

Generates complete outfit combinations with visual preview.

### 4. Outfit Shuffle

**File:** `app/shuffle.tsx`

Randomizer feature that:
- Displays items by layer (top, bottom, shoes, accessory)
- Swipe or tap to shuffle individual layers
- "Shuffle All" button for complete random outfit
- Lock layers to keep favorites while shuffling others

### 5. Wishlist with Wardrobe Blend

**File:** `app/wishlist.tsx`

Save items you're considering purchasing:
- Add items with image, name, brand, price, and store link
- "Blend with Closet" feature shows compatibility score
- Generates outfit suggestions mixing wishlist item with owned clothes
- Helps make informed purchase decisions

### 6. Trip Packing List (Premium)

**File:** `app/packing.tsx`

Smart packing assistant:
- Enter destination, dates, and trip type
- Automatically suggests items based on:
  - Weather/climate of destination
  - Trip duration
  - Planned activities
- Checklist interface with pack/unpack toggles
- Pulls from user's actual closet items

### 7. Fit Tracker

**File:** `app/(tabs)/tracker.tsx`

Daily outfit logging:
- Calendar view of the month
- Log what you wore each day
- Track wear count per item
- Cost-per-wear calculations
- Style analytics over time

### 8. Community Look Board

**File:** `app/(tabs)/community.tsx`

Social inspiration feed:
- "Style of the Day" featured look
- Masonry grid of community outfits
- Like and save looks for inspiration

---

## Data Models

### ClothingItem

```typescript
interface ClothingItem {
  id: string;
  imageUri: string;
  category: "tops" | "bottoms" | "dresses" | "outerwear" | "shoes" | "accessories" | "swimwear";
  type: string;              // e.g., "t-shirt", "jeans", "sneakers"
  color: string;
  brand: string;
  purchasePrice: number;
  tags: string[];
  occasions: Occasion[];     // "work" | "casual" | "party" | "sport" | "date-night"
  seasons: Season[];         // "spring" | "summer" | "fall" | "winter" | "all-season"
  createdAt: string;
  wearCount: number;
  lastWorn?: string;
}
```

### Outfit

```typescript
interface Outfit {
  id: string;
  name: string;
  items: string[];           // Array of ClothingItem IDs
  occasions: Occasion[];
  createdAt: string;
  wearCount: number;
}
```

### WishlistItem

```typescript
interface WishlistItem {
  id: string;
  imageUri: string;
  name: string;
  brand: string;
  price: number;
  productUrl?: string;
  category?: ClothingCategory;
  addedAt: string;
}
```

### Trip

```typescript
interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  climate: "tropical" | "temperate" | "cold" | "desert" | "mixed";
  activities: string[];
  packedItems: string[];     // ClothingItem IDs
  createdAt: string;
}
```

---

## API Endpoints

All API routes are defined in `server/routers.ts` using tRPC.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `clothing.recognizeFromImage` | POST | Analyze image with AI to identify clothing |
| `clothing.recognizeFromUrl` | POST | Scrape product details from store URL |
| `clothing.suggestOutfits` | POST | Generate outfit combinations from closet |
| `auth.me` | GET | Get current user info |
| `auth.logout` | POST | Log out current user |

---

## Environment Variables

### Required for Supabase

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Auto-configured (Manus Platform)

These are automatically injected by the platform:
- `FORGE_API_KEY` - AI/LLM API access
- `DATABASE_URL` - MySQL connection string
- `S3_*` - File storage credentials

---

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 9+
- Expo Go app (for mobile testing)

### Installation

```bash
# Clone repository
git clone https://github.com/MyindMedia/styleme-pro.git
cd styleme-pro

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Running on Device

1. Install Expo Go on your iOS/Android device
2. Scan the QR code shown in terminal
3. App will load in Expo Go

### Running on Web

The app runs in web browser at `http://localhost:8081`

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Metro bundler + backend server |
| `pnpm dev:metro` | Start only Metro bundler |
| `pnpm dev:server` | Start only backend server |
| `pnpm build` | Build server for production |
| `pnpm check` | TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Vitest tests |
| `pnpm db:push` | Push schema changes to database |

---

## Theming

Colors are defined in `theme.config.js` and automatically available in both Tailwind classes and the `useColors()` hook.

### Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | #0A0A0A | #FFFFFF | Accent color, buttons |
| `background` | #FFFFFF | #0A0A0A | Screen backgrounds |
| `surface` | #F8F8F8 | #1A1A1A | Cards, elevated surfaces |
| `foreground` | #0A0A0A | #FAFAFA | Primary text |
| `muted` | #6B6B6B | #A0A0A0 | Secondary text |
| `border` | #E5E5E5 | #2A2A2A | Borders, dividers |

### Usage

```tsx
// Tailwind classes
<View className="bg-background">
  <Text className="text-foreground">Hello</Text>
</View>

// useColors hook
const colors = useColors();
<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.foreground }}>Hello</Text>
</View>
```

---

## Changelog

### v1.0.0 (January 12, 2026)

**Initial Release**

- Digital closet with grid view and category filtering
- Smart item recognition (AI image analysis + URL scraping + manual entry)
- Detailed categorization system (types, occasions, seasons, brands)
- AI-powered outfit generation based on mood and occasion
- Outfit Shuffle/Randomizer feature
- Wishlist with wardrobe blend compatibility scoring
- Trip packing lists with weather-based suggestions
- Fit Tracker calendar for daily outfit logging
- Community Look Board for style inspiration
- High-fashion minimalist UI design
- Dark mode support
- Supabase database integration
- GitHub repository sync

**Research Incorporated:**
- Fits app features (outfit planning, closet management)
- Indyx app features (background removal concept, cost-per-wear, analytics)
- User-requested features from app store reviews

---

## Repository

**GitHub:** https://github.com/MyindMedia/styleme-pro

---

## Related Documentation

| File | Description |
|------|-------------|
| `CONTRIBUTING.md` | Code style guidelines and PR process for contributors |
| `ENV_SETUP.md` | Environment variables setup guide |
| `design.md` | UI/UX design specifications and screen layouts |
| `todo.md` | Feature tracking and development progress |
| `research-fits-app.md` | Fits app competitive analysis |
| `research-indyx-app.md` | Indyx app competitive analysis |
| `server/README.md` | Backend development guide |

---

## Support

For questions or issues, refer to the GitHub repository or contact the development team.
