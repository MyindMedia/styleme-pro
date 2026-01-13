-- FitCheck Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clothing Items Table
CREATE TABLE IF NOT EXISTS clothing_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_uri TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  brand TEXT,
  purchase_price DECIMAL(10,2) DEFAULT 0,
  purchase_date DATE,
  occasions TEXT[] DEFAULT '{}',
  seasons TEXT[] DEFAULT '{}',
  wear_count INTEGER DEFAULT 0,
  last_worn DATE,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outfits Table
CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_ids UUID[] NOT NULL,
  mood TEXT,
  occasions TEXT[] DEFAULT '{}',
  is_from_ai BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist Items Table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_uri TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  link TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  occasions TEXT[] DEFAULT '{}',
  seasons TEXT[] DEFAULT '{}',
  notes TEXT,
  is_priority BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  climate TEXT,
  occasions TEXT[] DEFAULT '{}',
  packing_list UUID[] DEFAULT '{}',
  is_packed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outfit Logs Table (for tracking daily outfits)
CREATE TABLE IF NOT EXISTS outfit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  item_ids UUID[] NOT NULL,
  notes TEXT,
  photo_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_id ON clothing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_clothing_items_category ON clothing_items(category);
CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_logs_user_id ON outfit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_logs_date ON outfit_logs(date);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for clothing_items
CREATE POLICY "Users can view their own clothing items" ON clothing_items
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own clothing items" ON clothing_items
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own clothing items" ON clothing_items
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own clothing items" ON clothing_items
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policies for outfits
CREATE POLICY "Users can view their own outfits" ON outfits
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own outfits" ON outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own outfits" ON outfits
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own outfits" ON outfits
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policies for wishlist_items
CREATE POLICY "Users can view their own wishlist items" ON wishlist_items
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own wishlist items" ON wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own wishlist items" ON wishlist_items
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own wishlist items" ON wishlist_items
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policies for trips
CREATE POLICY "Users can view their own trips" ON trips
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policies for outfit_logs
CREATE POLICY "Users can view their own outfit logs" ON outfit_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own outfit logs" ON outfit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own outfit logs" ON outfit_logs
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own outfit logs" ON outfit_logs
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create storage bucket for clothing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-images', 'clothing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for clothing-images bucket
CREATE POLICY "Anyone can view clothing images" ON storage.objects
  FOR SELECT USING (bucket_id = 'clothing-images');

CREATE POLICY "Authenticated users can upload clothing images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'clothing-images');

CREATE POLICY "Users can update their own clothing images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'clothing-images');

CREATE POLICY "Users can delete their own clothing images" ON storage.objects
  FOR DELETE USING (bucket_id = 'clothing-images');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on clothing_items
CREATE TRIGGER update_clothing_items_updated_at
  BEFORE UPDATE ON clothing_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
