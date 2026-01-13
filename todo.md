# FitCheck - Project TODO

## Core Setup
- [ ] Update theme colors to high-fashion minimalist palette
- [ ] Configure tab navigation with 5 tabs
- [ ] Add icon mappings for all tabs
- [ ] Set up AsyncStorage for local data persistence

## Closet Tab (Home)
- [ ] Create clothing item data model and storage
- [ ] Build closet grid view with FlatList
- [ ] Add category filter pills
- [ ] Implement floating action button for adding items
- [ ] Create item detail screen
- [ ] Build add item screen with camera/gallery picker
- [ ] Implement AI background removal placeholder
- [ ] Add item tagging (category, color, brand, price)

## Style Me Tab
- [ ] Create mood selector component
- [ ] Build outfit generation interface
- [ ] Implement AI outfit matching logic
- [ ] Create outfit card component
- [ ] Add virtual try-on placeholder
- [ ] Implement save outfit functionality

## Fit Tracker Tab
- [ ] Build calendar view component
- [ ] Create daily outfit logging flow
- [ ] Implement wear history tracking
- [ ] Build stats cards (cost-per-wear, most worn)
- [ ] Add quarterly recap section
- [ ] Create "not worn in 90 days" alerts

## Community Tab
- [ ] Build Style of the Day hero component
- [ ] Create masonry feed layout
- [ ] Implement heart/save interactions
- [ ] Add "Recreate Look" feature
- [ ] Build outfit submission flow

## Profile Tab
- [ ] Create profile screen layout
- [ ] Add closet stats summary
- [ ] Build settings screen
- [ ] Add subscription/upgrade CTA

## Branding
- [x] Generate custom app logo
- [x] Update app.config.ts with branding
- [x] Copy logo to all required asset locations


## UI Refinement (High-Fashion Look)
- [x] Update theme to match reference design (white bg, black accents, serif headings)
- [ ] Add serif font for headings (editorial style)
- [x] Create rounded card components with subtle shadows
- [x] Update closet grid to match product card style
- [x] Add "BLACK" watermark branding element
- [x] Refine button styles to pill-shaped black buttons
- [x] Update item detail screen to match product details style


## New Features (User Request)
- [x] Research Fits app features and incorporate best practices
- [x] Add detailed clothing type categorization (jeans, active, swimwear, business, casual, etc.)
- [x] Make brand selectable/manually inputtable if image scan fails
- [x] Add clothing style/occasion tags system
- [x] Create premium packing list feature for trip planning
- [x] Build trip packing checklist based on weather, climate, region, duration
- [x] Add trip creation flow with destination and dates


## Wishlist Feature (User Request)
- [x] Add WishlistItem type to storage with image, name, brand, price, link
- [x] Create wishlist storage functions (add, remove, get)
- [x] Build Wishlist screen to view saved items
- [x] Add "Blend with Closet" feature to show outfit combinations
- [x] Show compatibility score with current wardrobe
- [x] Generate outfit suggestions mixing wishlist + closet items

## Indyx App Research (User Request)
- [x] Research Indyx app features
- [x] Analyze user reviews for pain points and feature requests
- [x] Identify features to add to FitCheck

## Features from Indyx Research (To Implement)
- [x] Outfit Randomizer/Shuffle - swipe to mix and match items
- [ ] Weather-based outfit recommendations
- [ ] Automatic background removal for item photos
- [x] Cost-per-wear tracking and display (in item details)
- [ ] Enhanced closet analytics dashboard
- [ ] Outfit selfie capture and storage
- [ ] Inspiration boards for saving outfit ideas

## GitHub & Supabase Integration (User Request)
- [x] Create GitHub repository for FitCheck
- [x] Push code to GitHub
- [x] Configure Supabase as database
- [x] Set up Supabase tables for clothing items, outfits, wishlist, trips
- [x] Update app to use Supabase for cloud sync

## App Rename (User Request)
- [x] Update app name to "FitCheck" in app.config.ts
- [x] Update branding title in webdev secrets
- [x] Update any hardcoded references in the app
