---
objective: Implement User Authentication and Profile Management with Supabase
---

<objective>
Fully integrate Supabase Authentication into the app, ensuring users can sign up, sign in (Email/Password + OAuth), and manage their profile. Ensure the `AuthContext` correctly manages the session and synchronizes the user profile with the `user_profiles` table.
</objective>

<execution_context>
@contexts/AuthContext.tsx
@app/auth/login.tsx
@app/auth/signup.tsx
@lib/supabase.ts
</execution_context>

<context>
The `AuthContext.tsx` currently has placeholder logic or partial implementation. We need to ensure it robustly handles:
- Session persistence (AsyncStorage adapter for Supabase)
- Auth state changes (AuthStateChange listener)
- Profile fetching/creation (ensure `user_profiles` record exists on signup)
- Error handling
</context>

<tasks>
- [ ] Verify `lib/supabase.ts` uses `AsyncStorage` for session persistence.
- [ ] Update `AuthContext.tsx` to handle `INITIAL_SESSION` and `SIGNED_IN` / `SIGNED_OUT` events robustly.
- [ ] Ensure `user_profiles` table exists in Supabase (check migrations) or create it if missing from `001_initial_schema.sql`.
- [ ] Implement `fetchProfile` and `updateProfile` in `AuthContext` to sync with Supabase `user_profiles` table.
- [ ] Test Login and Signup flows (Email/Password).
- [ ] Verify OAuth (Google/Apple) redirection logic in `app/oauth/callback.tsx`.
</tasks>

<verification>
- [ ] User can sign up with email/password.
- [ ] User profile row is created in Supabase upon signup.
- [ ] User can log out and log back in; session persists across app restarts.
- [ ] OAuth redirect works and sets the session.
</verification>

<success_criteria>
- `AuthContext` provides a stable `user` and `profile` object.
- Authentication works reliably on mobile and web.
</success_criteria>
