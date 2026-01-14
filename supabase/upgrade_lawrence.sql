-- Upgrade user to Pro
-- Run this in the Supabase SQL Editor

-- Method 1: If the user profile already exists
UPDATE public.user_profiles
SET is_pro = true
WHERE email = 'lawrenceberment@gmail.com';

-- Method 2: Robust upsert (Creates profile if missing, linking to auth.users)
INSERT INTO public.user_profiles (id, email, is_pro, created_at, updated_at)
SELECT id, email, true, now(), now()
FROM auth.users
WHERE email = 'lawrenceberment@gmail.com'
ON CONFLICT (id) DO UPDATE
SET is_pro = true, updated_at = now();
