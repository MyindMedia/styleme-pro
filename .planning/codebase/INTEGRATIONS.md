# Integrations

## Authentication

### Manus OAuth System
- **Portal URL:** `EXPO_PUBLIC_OAUTH_PORTAL_URL`
- **Server URL:** `EXPO_PUBLIC_OAUTH_SERVER_URL`
- **App ID:** `EXPO_PUBLIC_APP_ID`
- **Owner ID:** `EXPO_PUBLIC_OWNER_OPEN_ID`

**Native Flow:**
- Deep linking with custom scheme
- Secure token storage: Expo SecureStore
- Session token in AsyncStorage

**Web Flow:**
- Cookie-based auth
- Session cookie via `JWT_SECRET`

**Endpoints:**
- `POST /api/oauth/callback` - OAuth callback
- `POST /api/auth/session` - Set session cookie
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/oauth/mobile` - Mobile token exchange

## Database

### MySQL (Drizzle ORM)
- **Connection:** `DATABASE_URL`
- **Schema:** `/drizzle/schema.ts`

**Core Tables:**
- `users` - User accounts (openId, name, email, role)

### Supabase
- **URL:** `EXPO_PUBLIC_SUPABASE_URL`
- **Key:** `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Tables:**
- clothing_items, outfits, outfit_logs
- trips, wishlist_items, user_profiles

**Storage Buckets:**
- `user-images` - User uploaded images
  - Folders: clothing, outfits, profile

**Helpers:** `/lib/supabase.ts`
- `uploadUserImage()`
- `deleteUserImage()`
- `listUserImages()`
- `getUserStorageUsage()`

## External APIs

### Remove.bg
- **API Key:** `REMOVE_BG_API_KEY`
- **Purpose:** Background removal from images

### Manus Forge API (Optional)
- **URL:** `BUILT_IN_FORGE_API_URL`
- **Key:** `BUILT_IN_FORGE_API_KEY`
- **Purpose:** AI features, image generation

## API Communication

### tRPC
- **Client:** `/lib/trpc.ts`
- **Server:** `/server/routers.ts`
- **Transformer:** SuperJSON
- **Endpoint:** `${API_BASE_URL}/api/trpc`

**Auth Headers:**
- Native: Bearer token
- Web: Cookie

### REST API
- **Client:** `/lib/_core/api.ts`
- **Base URL:** `EXPO_PUBLIC_API_BASE_URL`

## Local Storage

### AsyncStorage Keys
```
styleme_clothing_items
styleme_outfits
styleme_wear_logs
styleme_wishlist
styleme_trips
styleme_packing_lists
fitcheck_last_sync
fitcheck_sync_status
fitcheck_pending_changes
```

### Cloud Sync
- **Module:** `/lib/cloud-sync.ts`
- `uploadToCloud()` - Upload local data
- `downloadFromCloud()` - Download cloud data
- `performFullSync()` - Bidirectional sync

## Environment Variables

### Client-Side (EXPO_PUBLIC_*)
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_OAUTH_PORTAL_URL
EXPO_PUBLIC_OAUTH_SERVER_URL
EXPO_PUBLIC_APP_ID
EXPO_PUBLIC_OWNER_OPEN_ID
```

### Server-Side
```
NODE_ENV
DATABASE_URL
JWT_SECRET
OAUTH_SERVER_URL
OWNER_OPEN_ID
BUILT_IN_FORGE_API_URL
BUILT_IN_FORGE_API_KEY
REMOVE_BG_API_KEY
```

## Data Types

Defined in `/lib/storage.ts`:
- ClothingItem, ClothingCategory, ClothingType
- Outfit, MoodTag, WearLog
- Trip, TripType, ClimateType
- PackingList, PackingItem
- WishlistItem, WishlistBlend
- UserProfile, UserBodyMeasurements

## Server Infrastructure

- **Framework:** Express 4.22.1
- **Port:** 3000 (API), 8081 (Metro)
- **Serverless:** serverless-http for Lambda
