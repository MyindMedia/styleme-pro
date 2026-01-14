# Project: FitCheck (StyleMe Pro)

## Goal
Build an AI-powered wardrobe and outfit planning mobile application that helps users manage their closet, generate outfits based on mood/weather/occasion, and track their style analytics. The app aims to provide a high-fashion, minimalist experience with smart automation for item entry (AI recognition) and outfit creation.

## Core Features
- **Smart Closet**: Digital wardrobe with detailed categorization (type, occasion, season, brand).
- **AI Recognition**: Automatic item identification via image analysis or product URL scraping.
- **Outfit Generation**: AI-powered outfit suggestions based on mood, occasion, and weather.
- **Virtual Try-On**: AI visualization of garments on user avatars.
- **Wishlist Blend**: Compatibility scoring for potential purchases against existing wardrobe.
- **Trip Packing**: Smart packing lists based on destination weather.
- **Fit Tracker**: Calendar-based outfit logging with cost-per-wear analytics.
- **Community**: Social inspiration feed.

## Tech Stack
- **Framework**: Expo SDK 54, React Native 0.81
- **Language**: TypeScript 5.9
- **Routing**: Expo Router 6
- **Styling**: NativeWind 4 (Tailwind CSS)
- **State**: React Context, AsyncStorage, TanStack Query
- **Backend**: Express, tRPC
- **Database**: Supabase (PostgreSQL)
- **AI**: Manus Forge API (Gemini-2.5-Flash)
- **Infrastructure**: Netlify (Functions)

## Design System
- **Theme**: High-fashion minimalist (Warm Cream/Off-White background, Soft Charcoal accents).
- **Typography**: Sans-serif (System), clean and modern.
- **Components**: Rounded cards, pill-shaped buttons, "STYLE" watermark branding.

## Constraints & Preferences
- **Mobile First**: Optimized for iOS and Android via Expo.
- **Offline Capable**: Local-first architecture with cloud sync (Supabase).
- **Performance**: Fast image loading (Expo Image), smooth animations (Reanimated).
- **Code Quality**: Strict TypeScript, ESLint, Prettier.

## Current Status
- **Completed**: Core closet management, AI item recognition, manual entry, basic outfit generation, shuffle, wishlist, packing list, fit tracker UI.
- **In Progress**: Google reverse image lookup (partially done), Weather integration, User Authentication, Cloud Sync.
- **Planned**: Background removal, advanced analytics, social sharing.
