import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Check if we're running in a browser/client environment
const isBrowser = typeof window !== "undefined";

// Custom storage adapter for React Native with SSR safety
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (!isBrowser) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isBrowser) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Silently fail on SSR
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (!isBrowser) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Silently fail on SSR
    }
  },
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: isBrowser,
    detectSessionInUrl: Platform.OS === "web" && isBrowser,
  },
});

// Database types
export interface DbClothingItem {
  id: string;
  user_id?: string;
  image_uri: string;
  category: string;
  type: string;
  color: string;
  brand?: string;
  purchase_price: number;
  purchase_date?: string;
  occasions: string[];
  seasons: string[];
  wear_count: number;
  last_worn?: string;
  notes?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOutfit {
  id: string;
  user_id?: string;
  name: string;
  item_ids: string[];
  mood: string;
  occasions: string[];
  is_from_ai: boolean;
  created_at: string;
}

export interface DbWishlistItem {
  id: string;
  user_id?: string;
  image_uri: string;
  name: string;
  brand?: string;
  price: number;
  link?: string;
  category: string;
  type: string;
  color: string;
  occasions: string[];
  seasons: string[];
  notes?: string;
  is_priority: boolean;
  added_at: string;
}

export interface DbTrip {
  id: string;
  user_id?: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  climate: string;
  occasions: string[];
  packing_list: string[];
  is_packed: boolean;
  created_at: string;
}

export interface DbOutfitLog {
  id: string;
  user_id?: string;
  date: string;
  outfit_id?: string;
  item_ids: string[];
  notes?: string;
  photo_uri?: string;
  created_at: string;
}

// Helper functions for Supabase operations
export const supabaseHelpers = {
  // Clothing Items
  async getClothingItems(): Promise<DbClothingItem[]> {
    const { data, error } = await supabase
      .from("clothing_items")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching clothing items:", error);
      return [];
    }
    return data || [];
  },

  async saveClothingItem(item: Omit<DbClothingItem, "created_at" | "updated_at">): Promise<DbClothingItem | null> {
    const { data, error } = await supabase
      .from("clothing_items")
      .upsert({
        ...item,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error saving clothing item:", error);
      return null;
    }
    return data;
  },

  async deleteClothingItem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("clothing_items")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting clothing item:", error);
      return false;
    }
    return true;
  },

  // Outfits
  async getOutfits(): Promise<DbOutfit[]> {
    const { data, error } = await supabase
      .from("outfits")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching outfits:", error);
      return [];
    }
    return data || [];
  },

  async saveOutfit(outfit: DbOutfit): Promise<DbOutfit | null> {
    const { data, error } = await supabase
      .from("outfits")
      .upsert(outfit)
      .select()
      .single();
    
    if (error) {
      console.error("Error saving outfit:", error);
      return null;
    }
    return data;
  },

  // Wishlist
  async getWishlistItems(): Promise<DbWishlistItem[]> {
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("*")
      .order("added_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching wishlist items:", error);
      return [];
    }
    return data || [];
  },

  async saveWishlistItem(item: DbWishlistItem): Promise<DbWishlistItem | null> {
    const { data, error } = await supabase
      .from("wishlist_items")
      .upsert(item)
      .select()
      .single();
    
    if (error) {
      console.error("Error saving wishlist item:", error);
      return null;
    }
    return data;
  },

  async deleteWishlistItem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting wishlist item:", error);
      return false;
    }
    return true;
  },

  // Trips
  async getTrips(): Promise<DbTrip[]> {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: true });
    
    if (error) {
      console.error("Error fetching trips:", error);
      return [];
    }
    return data || [];
  },

  async saveTrip(trip: DbTrip): Promise<DbTrip | null> {
    const { data, error } = await supabase
      .from("trips")
      .upsert(trip)
      .select()
      .single();
    
    if (error) {
      console.error("Error saving trip:", error);
      return null;
    }
    return data;
  },

  async deleteTrip(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting trip:", error);
      return false;
    }
    return true;
  },

  // Outfit Logs
  async getOutfitLogs(): Promise<DbOutfitLog[]> {
    const { data, error } = await supabase
      .from("outfit_logs")
      .select("*")
      .order("date", { ascending: false });
    
    if (error) {
      console.error("Error fetching outfit logs:", error);
      return [];
    }
    return data || [];
  },

  async saveOutfitLog(log: DbOutfitLog): Promise<DbOutfitLog | null> {
    const { data, error } = await supabase
      .from("outfit_logs")
      .upsert(log)
      .select()
      .single();
    
    if (error) {
      console.error("Error saving outfit log:", error);
      return null;
    }
    return data;
  },

  // Upload image to Supabase Storage (legacy - uses shared bucket)
  async uploadImage(uri: string, bucket: string = "clothing-images"): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // Fetch the image and convert to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: "image/jpeg",
        });

      if (error) {
        console.error("Error uploading image:", error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  },

  // Upload image to user-specific folder in storage
  async uploadUserImage(
    uri: string,
    userId: string,
    folder: "clothing" | "outfits" | "profile" = "clothing"
  ): Promise<{ url: string; path: string } | null> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${userId}/${folder}/${fileName}`;

      // Fetch the image and convert to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from("user-images")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        console.error("Error uploading user image:", error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("user-images")
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error("Error uploading user image:", error);
      return null;
    }
  },

  // Delete image from user's storage
  async deleteUserImage(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from("user-images")
        .remove([filePath]);

      if (error) {
        console.error("Error deleting user image:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error deleting user image:", error);
      return false;
    }
  },

  // List all images in user's folder
  async listUserImages(
    userId: string,
    folder: "clothing" | "outfits" | "profile" = "clothing"
  ): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from("user-images")
        .list(`${userId}/${folder}`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.error("Error listing user images:", error);
        return [];
      }

      return data.map((file) => {
        const { data: urlData } = supabase.storage
          .from("user-images")
          .getPublicUrl(`${userId}/${folder}/${file.name}`);
        return urlData.publicUrl;
      });
    } catch (error) {
      console.error("Error listing user images:", error);
      return [];
    }
  },

  // Get user's storage usage
  async getUserStorageUsage(userId: string): Promise<{ used: number; limit: number } | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("storage_used, storage_limit")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error getting storage usage:", error);
        return null;
      }

      return {
        used: data.storage_used || 0,
        limit: data.storage_limit || 104857600, // 100MB default
      };
    } catch (error) {
      console.error("Error getting storage usage:", error);
      return null;
    }
  },
};

export default supabase;
