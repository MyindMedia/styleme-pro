-- User-Specific Storage Buckets Migration
-- This migration sets up individual storage folders per user within a single bucket
-- and creates functions to automatically manage user storage

-- Create the user-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-images',
  'user-images',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if they exist (to recreate with proper user isolation)
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view user images" ON storage.objects;

-- Policy: Users can only view images in their own folder (or public images)
CREATE POLICY "Users can view their own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-images' AND (
      -- User can see their own folder
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      -- Or anyone can see public folder
      OR (storage.foldername(name))[1] = 'public'
    )
  );

-- Policy: Public read access to all user images (since bucket is public)
CREATE POLICY "Public can view user images" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-images');

-- Policy: Users can only upload to their own folder
CREATE POLICY "Users can upload to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can only update files in their own folder
CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can only delete files in their own folder
CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create a user_profiles table to store additional user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 104857600, -- 100MB default limit per user
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update user storage usage
CREATE OR REPLACE FUNCTION update_user_storage_usage()
RETURNS TRIGGER AS $$
DECLARE
  user_folder TEXT;
  total_size BIGINT;
BEGIN
  -- Extract user ID from the file path
  IF TG_OP = 'DELETE' THEN
    user_folder := (storage.foldername(OLD.name))[1];
  ELSE
    user_folder := (storage.foldername(NEW.name))[1];
  END IF;

  -- Calculate total storage used by this user
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
  INTO total_size
  FROM storage.objects
  WHERE bucket_id = 'user-images'
    AND (storage.foldername(name))[1] = user_folder;

  -- Update the user's profile with new storage usage
  UPDATE public.user_profiles
  SET storage_used = total_size,
      updated_at = NOW()
  WHERE id = user_folder::uuid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update storage usage on file changes
DROP TRIGGER IF EXISTS on_storage_object_change ON storage.objects;
CREATE TRIGGER on_storage_object_change
  AFTER INSERT OR UPDATE OR DELETE ON storage.objects
  FOR EACH ROW
  WHEN (
    (TG_OP = 'DELETE' AND OLD.bucket_id = 'user-images') OR
    (TG_OP != 'DELETE' AND NEW.bucket_id = 'user-images')
  )
  EXECUTE FUNCTION update_user_storage_usage();

-- Function to check if user has storage space available
CREATE OR REPLACE FUNCTION check_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_folder TEXT;
  current_usage BIGINT;
  user_limit BIGINT;
  new_file_size BIGINT;
BEGIN
  user_folder := (storage.foldername(NEW.name))[1];
  new_file_size := COALESCE((NEW.metadata->>'size')::bigint, 0);

  SELECT storage_used, storage_limit
  INTO current_usage, user_limit
  FROM public.user_profiles
  WHERE id = user_folder::uuid;

  IF current_usage + new_file_size > user_limit THEN
    RAISE EXCEPTION 'Storage limit exceeded. Current: % bytes, Limit: % bytes', current_usage, user_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check storage limit before upload
DROP TRIGGER IF EXISTS check_storage_before_upload ON storage.objects;
CREATE TRIGGER check_storage_before_upload
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'user-images')
  EXECUTE FUNCTION check_storage_limit();

-- Add updated_at trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
