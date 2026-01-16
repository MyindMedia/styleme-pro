# FitCheck - Comprehensive App Build Prompt



## Master Generation Prompt
Copy and paste the following prompt to an AI coding assistant to generate this application:

**Role:** Expert React Native Developer
**Task:** Build the "FitCheck" mobile application from scratch.

**Context:**
You are building "FitCheck", an intelligent wardrobe manager. The goal is to create a high-quality, production-ready React Native app using the "Verve" design system.

**Tech Stack Constraints:**
- Use **React Native** with **TypeScript**.
- Use **Supabase** for Backend-as-a-Service (Auth, DB, Storage).
- Use **NativeWind** (Tailwind) for styling.
- **DO NOT** use managed Expo services (like Expo Go features) that require cloud builds if possible; prefer standard React Native libraries where applicable, or bare workflow compatible packages.
- Use **tRPC** for type-safe API calls.

**Step-by-Step Instructions:**

1.  **Project Setup:**
    - Initialize a new React Native project (TypeScript).
    - Configure NativeWind with the "Verve" theme colors and fonts (Playfair Display).
    - Setup Supabase client.

2.  **Authentication:**
    - Build a `LoginScreen` and `SignupScreen`.
    - Implement Email/Password auth logic.

3.  **Wardrobe Feature (The Core):**
    - Build `AddItemScreen`.
    - Implement Image Picker (Camera/Gallery).
    - **CRITICAL:** Implement the `remove.bg` API integration to strip backgrounds from clothing images automatically.
    - Save the resulting image to Supabase Storage `user-images`.
    - Save metadata to the `clothing_items` table.

4.  **Styling & Logic:**
    - Build the `ClosetScreen` to display a grid of user items.
    - Implement the `OutfitCanvas` for combining items.

5.  **Refinement:**
    - Ensure all UI components strictly follow the "Verve" design system (Earth tones, minimalist).
    - Add error handling and loading states.

**Deliverable:**
A complete, working codebase structure with all necessary components, screens, and configuration files.


## 1. Project Overview
**App Name:** FitCheck
**Type:** Intelligent Digital Wardrobe & Personal Stylist
**Platform:** React Native (iOS & Android)
**Design System:** "Verve" (Minimalist Earth Tones)

## 2. Tech Stack (Non-Expo Services)
*   **Framework:** React Native
*   **Language:** TypeScript
*   **Styling:** NativeWind (Tailwind CSS)
*   **Backend:** Node.js + tRPC (Serverless)
*   **Database:** Supabase (PostgreSQL, Auth, Storage)
*   **State Management:** React Query (`@tanstack/react-query`)
*   **Navigation:** File-based Routing (React Navigation/Expo Router compatible)

## 3. Design System: "Verve"
A minimalist aesthetic inspired by high-end fashion editorials.

### Color Palette
| Color | Hex | Usage |
| :--- | :--- | :--- |
| **Primary (Brown)** | `#7A6857` | Headers, Primary Buttons |
| **Background (Off-White)** | `#FEFEFE` | App Background |
| **Surface (Subtle Grey)** | `#F0F0F1` | Cards, Inputs |
| **Accent (Cream)** | `#C8B7A1` | Borders, Secondary Elements |
| **Text (Dark)** | `#0A0A0A` | Headings, Body Text |
| **Error (Red)** | `#F54228` | Validation Errors |

### Typography
*   **Headings:** `Playfair Display` (Serif) - Used for titles and headers.
*   **Body:** System Sans-serif - Used for readability in lists and descriptions.

## 4. Comprehensive Feature List

### 🔐 Authentication & User Profile
*   **Sign Up / Login:** Email & Password + Google OAuth.
*   **Profile Management:** Edit name, profile picture, and style preferences.
*   **Secure Session:** Auto-persist session tokens using secure storage.

### 👗 Wardrobe Management
*   **Add Items:**
    *   **Camera:** Capture new clothing items directly.
    *   **Gallery:** Import existing photos.
    *   **Link Paste:** Scrape product details from a store URL.
*   **AI Auto-Tagging:** Automatically detect Category, Color, Brand, and Style using Computer Vision (GPT-4 Vision).
*   **Background Removal:**
    *   **FREE Feature:** Automatically remove backgrounds from all uploaded items.
    *   **Storage:** Save processed clean images to local storage and sync to cloud.
*   **Digital Closet:** View all items in a grid, filter by category/season/color.

### 🎨 Styling & Outfits
*   **Outfit Canvas:** Drag-and-drop interface to create freeform outfit collages.
*   **AI Stylist:** "Magic" button generates 3 outfit suggestions based on:
    *   A specific "Hero Item" you want to wear.
    *   Current Mood (e.g., "Professional", "Cozy").
*   **Weather Integration:**
    *   Fetches local weather (Open-Meteo).
    *   Suggests outfits appropriate for the current temperature and conditions (e.g., "It's rainy, wear these boots").

### 🛍️ Shopping & Monetization
*   **Wishlist:** Save items from the web to a wishlist.
*   **Pro Subscription (RevenueCat):**
    *   **Free Tier:** Unlimited items, Background Removal, Basic Stats.
    *   **Pro Tier:** Unlimited AI Scans, Advanced Style Analytics, Priority Support.
    *   **Paywall:** Custom UI blocking Pro features.

### ✈️ Travel Packing
*   **Trip Planner:** Create packing lists for specific dates and destinations.
*   **Auto-Pack:** AI suggests a packing list based on the destination's weather forecast.

## 5. Database Schema (Supabase)

### Tables
1.  **`user_profiles`**
    *   `id` (UUID, PK)
    *   `is_pro` (Boolean)
    *   `preferences` (JSONB)
2.  **`clothing_items`**
    *   `id` (UUID, PK)
    *   `image_uri` (Text)
    *   `category` (Text)
    *   `brand` (Text)
    *   `color` (Text)
    *   `seasons` (Text[])
    *   `occasions` (Text[])
3.  **`outfits`**
    *   `id` (UUID, PK)
    *   `item_ids` (UUID[])
    *   `mood` (Text)
    *   `is_from_ai` (Boolean)
4.  **`trips`**
    *   `id` (UUID, PK)
    *   `destination` (Text)
    *   `start_date` (Date)
    *   `end_date` (Date)
    *   `packing_list` (Text[])

### RLS Policies
*   **Strict Security:** Users can ONLY `SELECT`, `INSERT`, `UPDATE`, `DELETE` rows where `user_id` matches their Auth ID.

## 6. Backend Logic (tRPC Router)

### Endpoints
*   `clothing.recognizeFromImage`: Accepts Image Base64 -> Returns JSON attributes.
*   `clothing.recognizeFromUrl`: Accepts URL -> Returns Product Data.
*   `imageProcessing.removeBackground`: Accepts Image Base64 -> Returns Clean PNG.
*   `weather.getRecommendation`: Accepts Lat/Long -> Returns Outfit Advice.
*   `tryOn.generate`: (Optional) AI Virtual Try-On feature.

## 7. Build Instructions for Agent
1.  **Initialize Project:** Setup React Native with TypeScript and NativeWind.
2.  **Setup Design System:** Configure `tailwind.config.js` with the "Verve" palette and fonts.
3.  **Implement Auth:** Build Login/Signup screens with Supabase Auth.
4.  **Build Core Features:**
    *   Implement `AddItem` screen with Camera/Gallery + Background Removal logic.
    *   Implement `Closet` grid view.
    *   Implement `OutfitCanvas` with drag-and-drop.
5.  **Integrate Backend:** Connect tRPC client to server functions.
6.  **Final Polish:** Ensure all RLS policies are active and UI matches the design system.

***
