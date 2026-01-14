I will redesign the **FitCheck** app to match the **Verve** design system, incorporating the "Playfair Display" typography and the Earth-tone color palette (Cream, Brown, Dark Brown).

### **1. Setup Design Tokens**
- **Install Fonts:** Add `@expo-google-fonts/playfair-display` and `expo-font`.
- **Configure Colors:** Update `theme.config.js` with the exact palette from your design:
  - **Primary:** Dark Black (`#0A0A0A`), Cream (`#C8B7A1`), Brown (`#7A6857`), Dark Brown (`#4F3228`).
  - **Secondary:** Grey (`#B6B6B7`), Subtle Grey (`#F0F0F1`), Red (`#F54228`).
- **Configure Typography:** Update `tailwind.config.js` to add `font-playfair` and ensure it loads in `app/_layout.tsx`.

### **2. Redesign Key Screens**
I will rewrite the following screens to match the Verve layout while keeping the existing logic (Supabase auth, database data, etc.):

- **Authentication:**
  - **Login (`app/auth/login.tsx`):** "MEET YOUR ACCOUNT" header, rounded inputs, Stone/Brown buttons.
  - **Sign Up (`app/auth/signup.tsx`):** "START YOUR ADVENTURE" header, consistent styling.

- **Onboarding (`app/onboarding.tsx`):**
  - Minimalist layout with "STYLE YOURSELF within" typography and image grids.

- **Main Tabs:**
  - **Home (`app/(tabs)/index.tsx`):** Implement the "HOME" layout with "New Season", "Categories", and "Popular" sections using the new card styles.
  - **Explore/Style (`app/(tabs)/style.tsx`):** Redesign the "Style Me" screen to look like the "EXPLORE" or "Collections" design (grid of collections/outfits).
  - **Profile (`app/(tabs)/profile.tsx`):** Clean up the profile to match the minimalist aesthetic.

### **3. Components**
- Update buttons, inputs, and cards to use `rounded-xl` or `rounded-full` and the new color scheme (removing the old purple/blue accents).

**Note:** I will use the functional logic already present (AuthContext, Supabase hooks) and just wrap them in the new UI. I will also install necessary dependencies.