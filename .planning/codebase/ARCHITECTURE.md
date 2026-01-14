# Architecture

## Overview
Hybrid Mobile-Web App with Full-Stack TypeScript

**Pattern:** Server-Client separation
- **Frontend:** Expo Router (file-based) + React Native (cross-platform)
- **Backend:** Express.js + tRPC (type-safe RPC)
- **Database:** Supabase (PostgreSQL) + Drizzle ORM
- **State:** Context API + React Query

## State Management

### Authentication State (React Context)
- Provider: `AuthContext.tsx` in `/contexts`
- Manages: User, Session, UserProfile
- Persists: AsyncStorage (mobile) + Supabase Auth
- Methods: Email/password, OAuth (Google/Apple/Facebook)

### Theme State (React Context + NativeWind)
- Provider: `ThemeProvider` in `/lib/theme-provider.tsx`
- Light/Dark mode switching
- CSS Variables for styling

### Server State (React Query + tRPC)
- tRPC client in `/lib/trpc.ts`
- Batched HTTP requests
- SuperJSON serialization

### Local Storage (AsyncStorage)
- Clothing items, outfits, wear logs, wishlist
- Cloud sync via `/lib/cloud-sync.ts`

## Data Flow

```
React Component
  → useAuth()/useColors() hooks
  → tRPC client
  → /api/trpc endpoint
  → Express middleware
  → tRPC router
  → Database (Drizzle/Supabase)
```

## Component Hierarchy

```
app/_layout.tsx (RootLayout)
├── GestureHandlerRootView
├── SafeAreaProvider
├── ThemeProvider
├── tRPC Provider + QueryClientProvider
├── AuthProvider
├── AuthGuard (routing logic)
└── Stack Navigation
    ├── (tabs) - Tab-based navigation
    ├── auth - Login/Signup flows
    ├── onboarding - First-time user flow
    └── oauth/callback - OAuth redirect handler
```

## Navigation Structure

**Tab Navigation:**
- dashboard (Home) - Main overview
- index (Closet) - Clothing collection
- style (Style Me) - AI outfit generation
- tracker (Tracker) - Outfit wear logs
- profile (Profile) - User settings

**Feature Screens (Modal/Stack):**
- add-item, selfie-capture, try-on
- outfit-compare, weather-outfit, packing
- analytics, wishlist, shuffle

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Expo Router | Cross-platform, file-based routing |
| tRPC | Type-safe client-server, no API docs |
| Supabase | Real-time auth, PostgreSQL, storage |
| React Query | Caching, stale-while-revalidate |
| AsyncStorage | Offline-first support |
| NativeWind | Tailwind on React Native |
| Context API | Lightweight state for auth/theme |
