# Directory Structure

```
styleme-pro-main/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with providers
│   ├── (tabs)/                  # Tab navigation group
│   │   ├── _layout.tsx          # Tab config
│   │   ├── index.tsx            # Closet/Items list
│   │   ├── dashboard.tsx        # Home dashboard
│   │   ├── style.tsx            # Style Me (AI outfits)
│   │   ├── tracker.tsx          # Outfit tracker
│   │   ├── profile.tsx          # User profile
│   │   └── community.tsx        # Community (hidden)
│   ├── auth/                    # Authentication group
│   │   ├── login.tsx            # Email/password login
│   │   ├── signup.tsx           # Registration
│   │   └── forgot-password.tsx  # Password reset
│   ├── item/[id].tsx            # Item detail (dynamic)
│   ├── oauth/callback.tsx       # OAuth redirect handler
│   ├── onboarding.tsx           # First-time user flow
│   ├── add-item.tsx             # Add clothing item
│   ├── selfie-capture.tsx       # Camera capture
│   ├── try-on.tsx               # Virtual try-on
│   ├── outfit-compare.tsx       # Compare outfits
│   ├── weather-outfit.tsx       # Weather suggestions
│   ├── packing.tsx              # Trip packing list
│   ├── wishlist.tsx             # Wishlist
│   ├── shuffle.tsx              # Random outfit
│   └── analytics.tsx            # Wardrobe stats
│
├── server/                      # Backend API
│   ├── _core/                   # Core server setup
│   │   ├── index.ts             # Server entry (Express)
│   │   ├── app.ts               # Express configuration
│   │   ├── context.ts           # tRPC context factory
│   │   ├── trpc.ts              # tRPC router setup
│   │   ├── env.ts               # Environment validation
│   │   └── oauth.ts             # OAuth flow handling
│   ├── routers.ts               # tRPC router definitions
│   └── db.ts                    # Database helpers
│
├── lib/                         # Shared utilities
│   ├── _core/
│   │   ├── theme.ts             # Theme colors
│   │   ├── api.ts               # API configuration
│   │   └── auth.ts              # Client auth helpers
│   ├── supabase.ts              # Supabase client
│   ├── storage.ts               # Local storage
│   ├── cloud-sync.ts            # Cloud sync logic
│   ├── trpc.ts                  # tRPC client
│   └── theme-provider.tsx       # Theme context
│
├── contexts/                    # React Context providers
│   └── AuthContext.tsx          # Authentication context
│
├── components/                  # Reusable UI components
│   ├── screen-container.tsx     # Safe area wrapper
│   ├── parallax-scroll-view.tsx # Scroll effects
│   ├── themed-view.tsx          # Theme-aware View
│   └── ui/                      # UI primitives
│
├── hooks/                       # Custom React hooks
│   ├── use-auth.ts              # Auth hook
│   ├── use-colors.ts            # Theme colors
│   └── use-premium.ts           # Premium status
│
├── constants/                   # App constants
│   ├── theme.ts, oauth.ts, const.ts
│
├── shared/                      # Client + Server shared
│   ├── const.ts, types.ts
│
├── drizzle/                     # Database schema
│   ├── schema.ts                # Table definitions
│   └── migrations/              # Migration files
│
├── assets/                      # Static assets
├── tests/                       # Test files
└── scripts/                     # Build scripts
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | App root with providers |
| `app/(tabs)/_layout.tsx` | Tab navigation config |
| `server/_core/index.ts` | API server entry |
| `server/routers.ts` | tRPC router definitions |
| `lib/trpc.ts` | tRPC client factory |
| `contexts/AuthContext.tsx` | Auth provider/hook |

## Module Organization

**By Layer:**
- Presentation: `/app`, `/components`
- State: `/contexts`, `/hooks`
- Business Logic: `/lib`
- API: `/server`
- Data: `/drizzle`, `/lib/storage.ts`

## Routing Convention (Expo Router)

```
app/
├── (tabs)/index.tsx       → /
├── (tabs)/dashboard.tsx   → /dashboard
├── auth/login.tsx         → /auth/login
├── item/[id].tsx          → /item/{id}
└── oauth/callback.tsx     → /oauth/callback
```
