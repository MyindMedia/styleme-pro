-- Add Pro tier support to user_profiles table

-- Add is_pro column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;

-- Add pro_since column to track when user upgraded
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pro_since TIMESTAMPTZ;

-- Add subscription_id for payment tracking (optional)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Create index for pro users lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_pro ON user_profiles(is_pro);

-- Function to upgrade user to pro
CREATE OR REPLACE FUNCTION upgrade_to_pro(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE user_profiles
  SET
    is_pro = TRUE,
    pro_since = NOW(),
    storage_limit = 524288000, -- 500MB for pro users (5x more)
    updated_at = NOW()
  WHERE email = user_email;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to downgrade user from pro
CREATE OR REPLACE FUNCTION downgrade_from_pro(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE user_profiles
  SET
    is_pro = FALSE,
    pro_since = NULL,
    subscription_id = NULL,
    storage_limit = 104857600, -- Back to 100MB default
    updated_at = NOW()
  WHERE email = user_email;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
