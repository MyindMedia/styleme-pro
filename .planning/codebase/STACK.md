# Technology Stack

## Primary Languages
- **TypeScript** 5.9.3 - Primary language for client and server
- **JavaScript/JSX** - React components
- **SQL** - Drizzle ORM schema definitions

## Frameworks & Platforms
| Framework | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.29 | React Native framework for iOS/Android/Web |
| Expo Router | 6.0.19 | File-based routing |
| React | 19.1.0 | UI library |
| Express | 4.22.1 | Backend API server |

## Key Dependencies

### Backend & API
- **tRPC** 11.7.2 - Type-safe RPC framework
- **Drizzle ORM** 0.44.7 - Type-safe SQL query builder
- **MySQL2** 3.16.0 - Database driver
- **Jose** 6.1.0 - JWT token handling
- **Zod** 4.2.1 - Schema validation

### Client State & Data
- **@tanstack/react-query** 5.90.12 - Server state management
- **@supabase/supabase-js** 2.90.1 - Supabase client
- **@react-native-async-storage** 2.2.0 - Local storage
- **SuperJSON** 1.13.3 - Type-safe serialization

### UI & Styling
- **NativeWind** 4.2.1 - Tailwind for React Native
- **Tailwind CSS** 3.4.17 - Utility-first CSS
- **Expo Vector Icons** 15.0.3 - Icon library

### Mobile Features
- expo-audio, expo-video, expo-image
- expo-image-picker, expo-media-library
- expo-notifications, expo-location
- expo-web-browser (OAuth), expo-secure-store

### Animation & Gesture
- **React Native Reanimated** 4.1.6
- **React Native Gesture Handler** 2.28.0

## Build Tools
- **ESBuild** 0.25.12 - Server bundler
- **Metro** - React Native bundler
- **Vitest** 2.1.9 - Test runner
- **pnpm** 9.12.0 - Package manager

## Runtime Environment
- Node.js (current)
- Platforms: iOS, Android, Web
- Dev Server: Port 3000 (API), Port 8081 (Metro)

## Scripts
```bash
dev              # Development (metro + server)
build:web        # Export web bundle
build            # Build server ESM
test             # Run Vitest
db:push          # Drizzle schema migration
```
