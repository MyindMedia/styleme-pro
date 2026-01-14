import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { supabase, supabaseHelpers, DbClothingItem, DbOutfit, DbWishlistItem, DbTrip, DbOutfitLog } from "./supabase";

// ============ Types ============

export type ClothingCategory = "tops" | "bottoms" | "shoes" | "accessories" | "outerwear" | "dresses" | "swimwear";

export type ClothingType = {
  tops: "t-shirt" | "blouse" | "sweater" | "hoodie" | "tank-top" | "dress-shirt" | "polo" | "crop-top" | "cardigan" | "other";
  bottoms: "jeans" | "chinos" | "shorts" | "skirt" | "dress-pants" | "leggings" | "joggers" | "cargo" | "other";
  shoes: "sneakers" | "boots" | "heels" | "sandals" | "loafers" | "athletic" | "flats" | "oxfords" | "other";
  accessories: "bag" | "jewelry" | "hat" | "belt" | "scarf" | "watch" | "sunglasses" | "wallet" | "other";
  outerwear: "jacket" | "coat" | "blazer" | "vest" | "parka" | "windbreaker" | "denim-jacket" | "leather-jacket" | "other";
  dresses: "casual-dress" | "cocktail-dress" | "maxi-dress" | "mini-dress" | "formal-dress" | "sundress" | "other";
  swimwear: "bikini" | "one-piece" | "swim-trunks" | "cover-up" | "rash-guard" | "other";
};

export type Occasion = "business" | "casual" | "athletic" | "formal" | "swimwear" | "loungewear" | "date-night" | "party" | "travel";

export type Season = "spring" | "summer" | "fall" | "winter" | "all-season";

export interface ClothingItem {
  id: string;
  imageUri: string;
  name?: string; // Optional display name
  category: ClothingCategory;
  type: string; // Specific type within category
  color: string;
  brand: string;
  style?: "casual" | "business" | "athletic" | "formal" | "streetwear" | "loungewear";
  purchasePrice: number;
  currentValue?: number;
  tags: string[];
  occasions: Occasion[];
  seasons: Season[];
  size?: string;
  fabric?: string;
  condition?: "new" | "like-new" | "good" | "fair" | "worn";
  createdAt: string;
  wearCount: number;
  lastWornAt?: string;
  isFavorite?: boolean;
  measurements?: GarmentMeasurements;
  productUrl?: string; // Original product link for reference
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  mood: string;
  occasions: Occasion[];
  createdAt: string;
  isFromAI: boolean;
}

export type MoodTag = "confident" | "comfortable" | "stylish" | "casual" | "professional" | "creative" | "cozy" | "bold" | "minimal" | "elegant";

export interface WearLog {
  id: string;
  date: string;
  itemIds: string[];
  outfitId?: string;
  sharedToCommunity: boolean;
  imageUri?: string;
  notes?: string; // User's notes about the outfit
  moodTags?: MoodTag[]; // How they felt wearing it
  rating?: 1 | 2 | 3 | 4 | 5; // 1-5 star rating
  occasion?: string; // What event/occasion
  weather?: string; // Weather conditions that day
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  imageUri: string;
  itemIds: string[];
  mood?: string;
  likes: number;
  isStyleOfTheDay: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUri?: string; // User's profile photo
  tryOnAvatarUri?: string; // Full-body photo for virtual try-on
  digitalTwinUri?: string;
  isPro: boolean;
  createdAt: string;
  bodyType?: "petite" | "athletic" | "curvy" | "tall" | "average";
  skinTone?: string;
}

// ============ Trip & Packing Types ============

export type TripType = "business" | "vacation" | "adventure" | "beach" | "city" | "wedding" | "other";

export type ClimateType = "tropical" | "desert" | "temperate" | "cold" | "rainy" | "mixed";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripType: TripType;
  climate: ClimateType;
  activities: string[];
  createdAt: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  closetItemId?: string; // Link to closet item if from wardrobe
  name: string;
  category: "clothing" | "toiletries" | "electronics" | "documents" | "accessories" | "other";
  quantity: number;
  isPacked: boolean;
  isEssential: boolean;
}

export interface PackingList {
  id: string;
  tripId: string;
  items: PackingItem[];
  createdAt: string;
  lastModified: string;
}

// ============ Garment Measurements Types ============

export interface GarmentMeasurements {
  // Top measurements (in inches)
  chest?: number;
  waist?: number;
  length?: number;
  shoulderWidth?: number;
  sleeveLength?: number;
  // Bottom measurements
  inseam?: number;
  rise?: number;
  thigh?: number;
  legOpening?: number;
  hipWidth?: number;
  // Dress/Full body
  bustToHem?: number;
  // Shoe measurements
  usSize?: string;
  euSize?: number;
  // General
  sizeLabel?: string; // XS, S, M, L, XL, etc.
  fit?: "slim" | "regular" | "relaxed" | "oversized";
  stretchLevel?: "none" | "slight" | "moderate" | "high";
}

export interface UserBodyMeasurements {
  height?: number; // in inches
  weight?: number; // in lbs
  chest?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
  shoulderWidth?: number;
  armLength?: number;
  shoeSize?: string;
  preferredFit?: "slim" | "regular" | "relaxed";
}

export interface TryOnResult {
  id: string;
  userId: string;
  clothingItemId: string;
  generatedImageUri: string;
  fitAnalysis: {
    overallFit: "too-small" | "slightly-small" | "perfect" | "slightly-large" | "too-large";
    shoulderFit?: string;
    chestFit?: string;
    lengthFit?: string;
    recommendations?: string[];
  };
  createdAt: string;
}

// ============ Wishlist Types ============

export interface WishlistItem {
  id: string;
  imageUri: string;
  name: string;
  brand: string;
  price: number;
  link?: string; // URL to purchase
  category: ClothingCategory;
  type: string;
  color: string;
  occasions: Occasion[];
  seasons: Season[];
  notes?: string;
  addedAt: string;
  isPriority: boolean;
}

export interface WishlistBlend {
  wishlistItemId: string;
  compatibleItems: ClothingItem[];
  outfitSuggestions: {
    id: string;
    items: (ClothingItem | WishlistItem)[];
    score: number; // 0-100 compatibility score
  }[];
  overallScore: number;
}

// ============ Constants ============

export const CLOTHING_TYPES: Record<ClothingCategory, { key: string; label: string }[]> = {
  tops: [
    { key: "t-shirt", label: "T-Shirt" },
    { key: "blouse", label: "Blouse" },
    { key: "sweater", label: "Sweater" },
    { key: "hoodie", label: "Hoodie" },
    { key: "tank-top", label: "Tank Top" },
    { key: "dress-shirt", label: "Dress Shirt" },
    { key: "polo", label: "Polo" },
    { key: "crop-top", label: "Crop Top" },
    { key: "cardigan", label: "Cardigan" },
    { key: "other", label: "Other" },
  ],
  bottoms: [
    { key: "jeans", label: "Jeans" },
    { key: "chinos", label: "Chinos" },
    { key: "shorts", label: "Shorts" },
    { key: "skirt", label: "Skirt" },
    { key: "dress-pants", label: "Dress Pants" },
    { key: "leggings", label: "Leggings" },
    { key: "joggers", label: "Joggers" },
    { key: "cargo", label: "Cargo Pants" },
    { key: "other", label: "Other" },
  ],
  shoes: [
    { key: "sneakers", label: "Sneakers" },
    { key: "boots", label: "Boots" },
    { key: "heels", label: "Heels" },
    { key: "sandals", label: "Sandals" },
    { key: "loafers", label: "Loafers" },
    { key: "athletic", label: "Athletic" },
    { key: "flats", label: "Flats" },
    { key: "oxfords", label: "Oxfords" },
    { key: "other", label: "Other" },
  ],
  accessories: [
    { key: "bag", label: "Bag" },
    { key: "jewelry", label: "Jewelry" },
    { key: "hat", label: "Hat" },
    { key: "belt", label: "Belt" },
    { key: "scarf", label: "Scarf" },
    { key: "watch", label: "Watch" },
    { key: "sunglasses", label: "Sunglasses" },
    { key: "wallet", label: "Wallet" },
    { key: "other", label: "Other" },
  ],
  outerwear: [
    { key: "jacket", label: "Jacket" },
    { key: "coat", label: "Coat" },
    { key: "blazer", label: "Blazer" },
    { key: "vest", label: "Vest" },
    { key: "parka", label: "Parka" },
    { key: "windbreaker", label: "Windbreaker" },
    { key: "denim-jacket", label: "Denim Jacket" },
    { key: "leather-jacket", label: "Leather Jacket" },
    { key: "other", label: "Other" },
  ],
  dresses: [
    { key: "casual-dress", label: "Casual Dress" },
    { key: "cocktail-dress", label: "Cocktail Dress" },
    { key: "maxi-dress", label: "Maxi Dress" },
    { key: "mini-dress", label: "Mini Dress" },
    { key: "formal-dress", label: "Formal Dress" },
    { key: "sundress", label: "Sundress" },
    { key: "other", label: "Other" },
  ],
  swimwear: [
    { key: "bikini", label: "Bikini" },
    { key: "one-piece", label: "One Piece" },
    { key: "swim-trunks", label: "Swim Trunks" },
    { key: "cover-up", label: "Cover Up" },
    { key: "rash-guard", label: "Rash Guard" },
    { key: "other", label: "Other" },
  ],
};

export const OCCASIONS: { key: Occasion; label: string; icon: string }[] = [
  { key: "business", label: "Business", icon: "business-center" },
  { key: "casual", label: "Casual", icon: "weekend" },
  { key: "athletic", label: "Athletic", icon: "fitness-center" },
  { key: "formal", label: "Formal", icon: "diamond" },
  { key: "swimwear", label: "Swimwear", icon: "pool" },
  { key: "loungewear", label: "Loungewear", icon: "home" },
  { key: "date-night", label: "Date Night", icon: "favorite" },
  { key: "party", label: "Party", icon: "celebration" },
  { key: "travel", label: "Travel", icon: "flight" },
];

export const SEASONS: { key: Season; label: string }[] = [
  { key: "spring", label: "Spring" },
  { key: "summer", label: "Summer" },
  { key: "fall", label: "Fall" },
  { key: "winter", label: "Winter" },
  { key: "all-season", label: "All Season" },
];

export const POPULAR_BRANDS = [
  "Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Gucci", "Prada", "Louis Vuitton",
  "Levi's", "Gap", "Banana Republic", "J.Crew", "Ralph Lauren", "Tommy Hilfiger",
  "Calvin Klein", "Versace", "Balenciaga", "Burberry", "Chanel", "Dior",
  "Hermès", "Fendi", "Saint Laurent", "Bottega Veneta", "Valentino",
  "Moncler", "Canada Goose", "The North Face", "Patagonia", "Lululemon",
  "Athleta", "Under Armour", "New Balance", "Puma", "Reebok", "Converse",
  "Vans", "Dr. Martens", "Birkenstock", "Steve Madden", "Coach", "Michael Kors",
  "Kate Spade", "Tory Burch", "Anthropologie", "Free People", "Madewell",
  "Everlane", "Reformation", "AllSaints", "COS", "& Other Stories", "Massimo Dutti",
  "Other",
];

// ============ Storage Keys ============

const STORAGE_KEYS = {
  ITEMS: "styleme_items",
  OUTFITS: "styleme_outfits",
  WEAR_LOGS: "styleme_wear_logs",
  COMMUNITY_POSTS: "styleme_community_posts",
  USER_PROFILE: "styleme_user_profile",
  ONBOARDING_COMPLETE: "styleme_onboarding_complete",
  TRIPS: "styleme_trips",
  PACKING_LISTS: "styleme_packing_lists",
  WISHLIST: "styleme_wishlist",
};

// ============ Mapping Helpers ============

function mapToDbClothingItem(item: ClothingItem, userId?: string): Omit<DbClothingItem, "created_at" | "updated_at"> {
  return {
    id: item.id.includes("-") && item.id.split("-").length > 2 ? item.id : undefined as any, // Only use if it's a UUID, otherwise let DB generate
    user_id: userId,
    image_uri: item.imageUri,
    category: item.category,
    type: item.type,
    color: item.color,
    brand: item.brand,
    purchase_price: item.purchasePrice,
    occasions: item.occasions,
    seasons: item.seasons,
    wear_count: item.wearCount,
    last_worn: item.lastWornAt,
    is_favorite: !!item.isFavorite,
    notes: item.tags.join(", "),
  };
}

function mapFromDbClothingItem(dbItem: DbClothingItem): ClothingItem {
  return {
    id: dbItem.id,
    imageUri: dbItem.image_uri,
    category: dbItem.category as any,
    type: dbItem.type,
    color: dbItem.color,
    brand: dbItem.brand || "Unknown",
    purchasePrice: dbItem.purchase_price,
    tags: dbItem.notes ? dbItem.notes.split(",").map(t => t.trim()) : [],
    occasions: dbItem.occasions as any[],
    seasons: dbItem.seasons as any[],
    wearCount: dbItem.wear_count,
    lastWornAt: dbItem.last_worn,
    isFavorite: dbItem.is_favorite,
    createdAt: dbItem.created_at,
  };
}

function mapToDbWishlistItem(item: WishlistItem, userId: string): DbWishlistItem {
  return {
    id: item.id,
    user_id: userId,
    image_uri: item.imageUri,
    name: item.name,
    brand: item.brand,
    price: item.price,
    link: item.link,
    category: item.category,
    type: item.type,
    color: item.color,
    occasions: item.occasions,
    seasons: item.seasons,
    notes: item.notes,
    is_priority: item.isPriority,
    added_at: item.addedAt,
  };
}

function mapFromDbWishlistItem(dbItem: DbWishlistItem): WishlistItem {
  return {
    id: dbItem.id,
    imageUri: dbItem.image_uri,
    name: dbItem.name,
    brand: dbItem.brand || "",
    price: dbItem.price,
    link: dbItem.link,
    category: dbItem.category as any,
    type: dbItem.type,
    color: dbItem.color,
    occasions: dbItem.occasions as any[],
    seasons: dbItem.seasons as any[],
    notes: dbItem.notes,
    isPriority: dbItem.is_priority,
    addedAt: dbItem.added_at,
  };
}

function mapToDbTrip(trip: Trip, userId: string, packingList?: PackingList): DbTrip {
  return {
    id: trip.id,
    user_id: userId,
    name: trip.name,
    destination: trip.destination,
    start_date: trip.startDate,
    end_date: trip.endDate,
    climate: trip.climate,
    occasions: trip.activities,
    packing_list: packingList ? packingList.items.map(i => i.name) : [],
    is_packed: false,
    created_at: trip.createdAt,
  };
}

function mapFromDbTrip(dbItem: DbTrip): Trip {
  return {
    id: dbItem.id,
    name: dbItem.name,
    destination: dbItem.destination,
    startDate: dbItem.start_date,
    endDate: dbItem.end_date,
    tripType: "vacation", // Default as DB doesn't have trip_type
    climate: dbItem.climate as any,
    activities: dbItem.occasions || [],
    createdAt: dbItem.created_at,
  };
}

function mapToDbOutfitLog(log: WearLog, userId: string): DbOutfitLog {
  return {
    id: log.id,
    user_id: userId,
    date: log.date,
    outfit_id: log.outfitId,
    item_ids: log.itemIds,
    notes: log.notes,
    photo_uri: log.imageUri,
    created_at: new Date().toISOString(),
  };
}

function mapFromDbOutfitLog(dbItem: DbOutfitLog): WearLog {
  return {
    id: dbItem.id,
    date: dbItem.date,
    itemIds: dbItem.item_ids,
    outfitId: dbItem.outfit_id,
    imageUri: dbItem.photo_uri,
    notes: dbItem.notes,
    sharedToCommunity: false,
  };
}

// ============ Generic Storage Helpers ============

async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return defaultValue;
  }
}

async function setStorageItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
  }
}

// ============ Sync Helpers ============

/**
 * Ensures a local image URI is persistent by copying it to the document directory.
 * Useful for images from cache (ImagePicker) or temporary processing.
 */
async function persistImage(uri: string): Promise<string> {
  if (!uri || typeof uri !== 'string') return uri;
  
  // Skip remote URLs and base64
  if (uri.startsWith("http") || uri.startsWith("https") || uri.startsWith("data:")) return uri;

  // If we are on web, FileSystem might not work as expected for persistence, just return uri
  if (typeof window !== "undefined" && window.document) return uri;

  // If it's already in the document directory, we're good
  if (FileSystem.documentDirectory && uri.includes(FileSystem.documentDirectory)) {
    return uri;
  }

  try {
    // Create a unique filename
    const ext = uri.split('.').pop() || 'jpg';
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const newPath = `${FileSystem.documentDirectory}${filename}`;

    // Check if file exists at source
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.warn(`[Storage] Source image does not exist: ${uri}`);
      return uri;
    }

    // Copy to document directory
    await FileSystem.copyAsync({
      from: uri,
      to: newPath
    });

    console.log(`[Storage] Persisted image to: ${newPath}`);
    return newPath;
  } catch (error) {
    console.error("[Storage] Failed to persist image:", error);
    return uri;
  }
}

/**
 * Checks if a URI is local and uploads it to Supabase if authenticated.
 * Returns the remote URL or the original URI if upload fails or is not needed.
 */
async function uploadIfLocal(
  uri: string | undefined,
  userId: string,
  folder: "clothing" | "outfits" | "profile" = "clothing"
): Promise<string> {
  if (!uri || !supabaseHelpers.isLocalUri(uri)) {
    return uri || "";
  }

  console.log(`[Storage] Uploading local image to ${folder}...`);
  const result = await supabaseHelpers.uploadUserImage(uri, userId, folder);
  if (result) {
    console.log(`[Storage] Upload successful: ${result.url}`);
    return result.url;
  }

  console.warn(`[Storage] Failed to upload local image: ${uri}`);
  return uri;
}

// ============ Clothing Items ============

export async function getClothingItems(): Promise<ClothingItem[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const dbItems = await supabaseHelpers.getClothingItems();
    return dbItems.map(mapFromDbClothingItem);
  }

  return getStorageItem(STORAGE_KEYS.ITEMS, []);
}

export async function saveClothingItem(item: ClothingItem): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();

  // Persist image locally first (in case upload fails or for offline use)
  const persistentUri = await persistImage(item.imageUri);
  const itemWithPersistentImage = { ...item, imageUri: persistentUri };

  if (session?.user) {
    // Ensure image is uploaded if it's local
    const remoteUri = await uploadIfLocal(persistentUri, session.user.id, "clothing");
    const itemToSave = { ...itemWithPersistentImage, imageUri: remoteUri };

    const saved = await supabaseHelpers.saveClothingItem(mapToDbClothingItem(itemToSave, session.user.id) as any);
    return !!saved;
  } else {
    const items = await getClothingItems();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      items[existingIndex] = itemWithPersistentImage;
    } else {
      items.unshift(itemWithPersistentImage);
    }
    await setStorageItem(STORAGE_KEYS.ITEMS, items);
    return true;
  }
}

export async function deleteClothingItem(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    await supabaseHelpers.deleteClothingItem(id);
  } else {
    const items = await getClothingItems();
    const filtered = items.filter((i) => i.id !== id);
    await setStorageItem(STORAGE_KEYS.ITEMS, filtered);
  }
}

export async function updateItemWearCount(id: string): Promise<void> {
  const items = await getClothingItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.wearCount += 1;
    item.lastWornAt = new Date().toISOString();
    await setStorageItem(STORAGE_KEYS.ITEMS, items);
  }
}

export async function getItemsByFilter(filters: {
  category?: ClothingCategory;
  type?: string;
  occasion?: Occasion;
  season?: Season;
  brand?: string;
}): Promise<ClothingItem[]> {
  const items = await getClothingItems();
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.occasion && !item.occasions.includes(filters.occasion)) return false;
    if (filters.season && !item.seasons.includes(filters.season)) return false;
    if (filters.brand && item.brand !== filters.brand) return false;
    return true;
  });
}

// ============ Outfits ============

export async function getOutfits(): Promise<Outfit[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const dbOutfits = await supabaseHelpers.getOutfits();
    return dbOutfits.map(db => ({
      id: db.id,
      name: db.name,
      itemIds: db.item_ids,
      mood: db.mood,
      occasions: db.occasions as any[],
      createdAt: db.created_at,
      isFromAI: db.is_from_ai,
    }));
  }

  return getStorageItem(STORAGE_KEYS.OUTFITS, []);
}

export async function saveOutfit(outfit: Outfit): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    await supabaseHelpers.saveOutfit({
      id: outfit.id,
      user_id: session.user.id,
      name: outfit.name,
      item_ids: outfit.itemIds,
      mood: outfit.mood,
      occasions: outfit.occasions,
      is_from_ai: outfit.isFromAI,
      created_at: outfit.createdAt,
    });
  } else {
    const outfits = await getOutfits();
    const existingIndex = outfits.findIndex((o) => o.id === outfit.id);
    if (existingIndex >= 0) {
      outfits[existingIndex] = outfit;
    } else {
      outfits.unshift(outfit);
    }
    await setStorageItem(STORAGE_KEYS.OUTFITS, outfits);
  }
}

export async function deleteOutfit(id: string): Promise<void> {
  const outfits = await getOutfits();
  const filtered = outfits.filter((o) => o.id !== id);
  await setStorageItem(STORAGE_KEYS.OUTFITS, filtered);
}

// ============ Wear Logs ============

export async function getWearLogs(): Promise<WearLog[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const dbLogs = await supabaseHelpers.getOutfitLogs();
    return dbLogs.map(mapFromDbOutfitLog);
  }

  return getStorageItem(STORAGE_KEYS.WEAR_LOGS, []);
}

export async function saveWearLog(log: WearLog): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Ensure image is uploaded if it's local
    const remoteUri = log.imageUri ? await uploadIfLocal(log.imageUri, session.user.id, "outfits") : undefined;
    const logToSave = { ...log, imageUri: remoteUri };

    await supabaseHelpers.saveOutfitLog(mapToDbOutfitLog(logToSave, session.user.id));
  } else {
    const logs = await getWearLogs();
    logs.unshift(log);
    await setStorageItem(STORAGE_KEYS.WEAR_LOGS, logs);
  }

  // Update wear counts for each item
  for (const itemId of log.itemIds) {
    await updateItemWearCount(itemId);
  }
}

export async function getWearLogsForDate(date: string): Promise<WearLog[]> {
  const logs = await getWearLogs();
  return logs.filter((log) => log.date.startsWith(date.slice(0, 10)));
}

// ============ Community Posts ============

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  return getStorageItem(STORAGE_KEYS.COMMUNITY_POSTS, []);
}

export async function saveCommunityPost(post: CommunityPost): Promise<void> {
  const posts = await getCommunityPosts();
  posts.unshift(post);
  await setStorageItem(STORAGE_KEYS.COMMUNITY_POSTS, posts);
}

export async function getStyleOfTheDay(): Promise<CommunityPost | null> {
  const posts = await getCommunityPosts();
  return posts.find((p) => p.isStyleOfTheDay) || null;
}

// ============ User Profile ============

export async function getUserProfile(): Promise<UserProfile | null> {
  return getStorageItem(STORAGE_KEYS.USER_PROFILE, null);
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setStorageItem(STORAGE_KEYS.USER_PROFILE, profile);
}

// ============ Onboarding ============

export async function isOnboardingComplete(): Promise<boolean> {
  return getStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
}

export async function setOnboardingComplete(): Promise<void> {
  await setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
}

// ============ Trips & Packing Lists (Premium) ============

export async function getTrips(): Promise<Trip[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const dbTrips = await supabaseHelpers.getTrips();
    return dbTrips.map(mapFromDbTrip);
  }

  return getStorageItem(STORAGE_KEYS.TRIPS, []);
}

export async function saveTrip(trip: Trip): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const packingList = await getPackingListForTrip(trip.id);
    await supabaseHelpers.saveTrip(mapToDbTrip(trip, session.user.id, packingList || undefined));
  } else {
    const trips = await getTrips();
    const existingIndex = trips.findIndex((t) => t.id === trip.id);
    if (existingIndex >= 0) {
      trips[existingIndex] = trip;
    } else {
      trips.unshift(trip);
    }
    await setStorageItem(STORAGE_KEYS.TRIPS, trips);
  }
}

export async function deleteTrip(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    await supabaseHelpers.deleteTrip(id);
  } else {
    const trips = await getTrips();
    const filtered = trips.filter((t) => t.id !== id);
    await setStorageItem(STORAGE_KEYS.TRIPS, filtered);

    // Also delete associated packing list
    const lists = await getPackingLists();
    const filteredLists = lists.filter((l) => l.tripId !== id);
    await setStorageItem(STORAGE_KEYS.PACKING_LISTS, filteredLists);
  }
}

export async function getPackingLists(): Promise<PackingList[]> {
  return getStorageItem(STORAGE_KEYS.PACKING_LISTS, []);
}

export async function getPackingListForTrip(tripId: string): Promise<PackingList | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const dbTrips = await supabaseHelpers.getTrips();
    const trip = dbTrips.find(t => t.id === tripId);
    if (!trip || !trip.packing_list) return null;

    return {
      id: `pl-${trip.id}`,
      tripId: trip.id,
      items: trip.packing_list.map((name, index) => ({
        id: `item-${index}`,
        tripId: trip.id,
        name,
        category: "clothing",
        quantity: 1,
        isPacked: trip.is_packed,
        isEssential: true,
      })),
      createdAt: trip.created_at,
      lastModified: trip.created_at,
    };
  }

  const lists = await getPackingLists();
  return lists.find((l) => l.tripId === tripId) || null;
}

export async function savePackingList(list: PackingList): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const trips = await getTrips();
    const trip = trips.find(t => t.id === list.tripId);
    if (trip) {
      await saveTrip(trip); // This will call mapToDbTrip which uses getPackingListForTrip or the list we have
    }
  } else {
    const lists = await getPackingLists();
    const existingIndex = lists.findIndex((l) => l.id === list.id);
    if (existingIndex >= 0) {
      lists[existingIndex] = list;
    } else {
      lists.unshift(list);
    }
    await setStorageItem(STORAGE_KEYS.PACKING_LISTS, lists);
  }
}

export async function togglePackingItemPacked(listId: string, itemId: string): Promise<void> {
  const lists = await getPackingLists();
  const list = lists.find((l) => l.id === listId);
  if (list) {
    const item = list.items.find((i) => i.id === itemId);
    if (item) {
      item.isPacked = !item.isPacked;
      list.lastModified = new Date().toISOString();
      await setStorageItem(STORAGE_KEYS.PACKING_LISTS, lists);
    }
  }
}

// ============ Smart Packing Suggestions ============

export function generatePackingSuggestions(
  trip: Trip,
  closetItems: ClothingItem[]
): { category: string; suggestions: { name: string; closetItemId?: string; quantity: number }[] }[] {
  const duration = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const suggestions: { category: string; suggestions: { name: string; closetItemId?: string; quantity: number }[] }[] = [];

  // Clothing suggestions based on trip type and climate
  const clothingSuggestions: { name: string; closetItemId?: string; quantity: number }[] = [];

  // Tops
  const topsNeeded = Math.min(duration + 1, 7);
  const relevantTops = closetItems.filter((i) => i.category === "tops");
  for (let i = 0; i < topsNeeded; i++) {
    if (relevantTops[i]) {
      clothingSuggestions.push({ name: relevantTops[i].brand || "Top", closetItemId: relevantTops[i].id, quantity: 1 });
    } else {
      clothingSuggestions.push({ name: "Top", quantity: 1 });
    }
  }

  // Bottoms
  const bottomsNeeded = Math.min(Math.ceil(duration / 2) + 1, 4);
  const relevantBottoms = closetItems.filter((i) => i.category === "bottoms");
  for (let i = 0; i < bottomsNeeded; i++) {
    if (relevantBottoms[i]) {
      clothingSuggestions.push({ name: relevantBottoms[i].brand || "Bottom", closetItemId: relevantBottoms[i].id, quantity: 1 });
    } else {
      clothingSuggestions.push({ name: "Bottom", quantity: 1 });
    }
  }

  // Shoes based on trip type
  const shoesNeeded = trip.tripType === "adventure" ? 3 : 2;
  const relevantShoes = closetItems.filter((i) => i.category === "shoes");
  for (let i = 0; i < shoesNeeded; i++) {
    if (relevantShoes[i]) {
      clothingSuggestions.push({ name: relevantShoes[i].brand || "Shoes", closetItemId: relevantShoes[i].id, quantity: 1 });
    }
  }

  // Outerwear based on climate
  if (trip.climate === "cold" || trip.climate === "rainy" || trip.climate === "temperate") {
    const outerwear = closetItems.find((i) => i.category === "outerwear");
    if (outerwear) {
      clothingSuggestions.push({ name: outerwear.brand || "Jacket", closetItemId: outerwear.id, quantity: 1 });
    } else {
      clothingSuggestions.push({ name: "Jacket/Coat", quantity: 1 });
    }
  }

  // Swimwear for beach/tropical
  if (trip.tripType === "beach" || trip.climate === "tropical") {
    const swimwear = closetItems.filter((i) => i.category === "swimwear");
    swimwear.slice(0, 2).forEach((s) => {
      clothingSuggestions.push({ name: s.brand || "Swimwear", closetItemId: s.id, quantity: 1 });
    });
    if (swimwear.length === 0) {
      clothingSuggestions.push({ name: "Swimwear", quantity: 2 });
    }
  }

  suggestions.push({ category: "Clothing", suggestions: clothingSuggestions });

  // Toiletries
  suggestions.push({
    category: "Toiletries",
    suggestions: [
      { name: "Toothbrush & Toothpaste", quantity: 1 },
      { name: "Deodorant", quantity: 1 },
      { name: "Shampoo & Conditioner", quantity: 1 },
      { name: "Skincare", quantity: 1 },
      { name: "Sunscreen", quantity: trip.climate === "tropical" || trip.tripType === "beach" ? 2 : 1 },
    ],
  });

  // Electronics
  suggestions.push({
    category: "Electronics",
    suggestions: [
      { name: "Phone Charger", quantity: 1 },
      { name: "Power Bank", quantity: 1 },
      { name: "Headphones", quantity: 1 },
      { name: "Camera", quantity: 1 },
    ],
  });

  // Documents
  suggestions.push({
    category: "Documents",
    suggestions: [
      { name: "Passport/ID", quantity: 1 },
      { name: "Travel Insurance", quantity: 1 },
      { name: "Boarding Pass", quantity: 1 },
      { name: "Hotel Confirmation", quantity: 1 },
    ],
  });

  return suggestions;
}

// ============ Analytics Helpers ============

export async function getClosetStats() {
  const items = await getClothingItems();
  const logs = await getWearLogs();

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.currentValue || item.purchasePrice), 0);

  const categoryBreakdown = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<ClothingCategory, number>);

  const colorDistribution = items.reduce((acc, item) => {
    acc[item.color] = (acc[item.color] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const occasionBreakdown = items.reduce((acc, item) => {
    item.occasions?.forEach((occ) => {
      acc[occ] = (acc[occ] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const brandDistribution = items.reduce((acc, item) => {
    if (item.brand && item.brand !== "Unknown") {
      acc[item.brand] = (acc[item.brand] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const mostWornItem = items.reduce((max, item) =>
    item.wearCount > (max?.wearCount || 0) ? item : max,
    null as ClothingItem | null
  );

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const unwornItems = items.filter((item) => {
    if (!item.lastWornAt) return true;
    return new Date(item.lastWornAt) < ninetyDaysAgo;
  });

  const wornItemsCount = items.filter(item => item.wearCount > 0).length;
  const wearRatio = totalItems > 0 ? (wornItemsCount / totalItems) : 0;

  return {
    totalItems,
    totalValue,
    categoryBreakdown,
    colorDistribution,
    occasionBreakdown,
    brandDistribution,
    mostWornItem,
    unwornItems,
    totalWearLogs: logs.length,
    wearRatio,
  };
}

export function calculateCostPerWear(item: ClothingItem): number {
  if (item.wearCount === 0) return item.purchasePrice;
  return Math.round((item.purchasePrice / item.wearCount) * 100) / 100;
}

// ============ ID Generator ============

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


// ============ Wishlist Functions ============

export async function getWishlistItems(): Promise<WishlistItem[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const dbItems = await supabaseHelpers.getWishlistItems();
    return dbItems.map(mapFromDbWishlistItem);
  }

  return getStorageItem(STORAGE_KEYS.WISHLIST, []);
}

export async function saveWishlistItem(item: WishlistItem): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Ensure image is uploaded if it's local
    const remoteUri = await uploadIfLocal(item.imageUri, session.user.id, "clothing");
    const itemToSave = { ...item, imageUri: remoteUri };

    await supabaseHelpers.saveWishlistItem(mapToDbWishlistItem(itemToSave, session.user.id));
  } else {
    const items = await getWishlistItems();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.unshift(item);
    }
    await setStorageItem(STORAGE_KEYS.WISHLIST, items);
  }
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    await supabaseHelpers.deleteWishlistItem(id);
  } else {
    const items = await getWishlistItems();
    const filtered = items.filter((i) => i.id !== id);
    await setStorageItem(STORAGE_KEYS.WISHLIST, filtered);
  }
}

export async function toggleWishlistPriority(id: string): Promise<void> {
  const items = await getWishlistItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.isPriority = !item.isPriority;
    await saveWishlistItem(item);
  }
}

// ============ Data Migration ============

export async function syncLocalStorageToCloud(): Promise<{ success: boolean; itemsCount: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, itemsCount: 0 };

  try {
    const userId = session.user.id;
    let syncedCount = 0;

    // Sync Clothing Items
    const localItems = await getStorageItem<ClothingItem[]>(STORAGE_KEYS.ITEMS, []);
    if (localItems.length > 0) {
      console.log(`[Storage] Syncing ${localItems.length} items to cloud...`);
      for (const item of localItems) {
        const remoteUri = await uploadIfLocal(item.imageUri, userId, "clothing");
        const itemWithRemote = { ...item, imageUri: remoteUri };
        const dbItem = mapToDbClothingItem(itemWithRemote, userId);
        const saved = await supabaseHelpers.saveClothingItem(dbItem as any);
        if (saved) syncedCount++;
      }
    }

    // Sync Outfits
    const localOutfits = await getStorageItem<Outfit[]>(STORAGE_KEYS.OUTFITS, []);
    if (localOutfits.length > 0) {
      console.log(`[Storage] Syncing ${localOutfits.length} outfits...`);
      for (const outfit of localOutfits) {
        await supabaseHelpers.saveOutfit({
          id: outfit.id,
          user_id: userId,
          name: outfit.name,
          item_ids: outfit.itemIds,
          mood: outfit.mood,
          occasions: outfit.occasions,
          is_from_ai: outfit.isFromAI,
          created_at: outfit.createdAt,
        });
      }
    }

    // Sync Wishlist
    const localWishlist = await getStorageItem<WishlistItem[]>(STORAGE_KEYS.WISHLIST, []);
    if (localWishlist.length > 0) {
      console.log(`[Storage] Syncing ${localWishlist.length} wishlist items...`);
      for (const item of localWishlist) {
        const remoteUri = await uploadIfLocal(item.imageUri, userId, "clothing");
        const itemWithRemote = { ...item, imageUri: remoteUri };
        await supabaseHelpers.saveWishlistItem(mapToDbWishlistItem(itemWithRemote, userId));
      }
    }

    // Sync Trips
    const localTrips = await getStorageItem<Trip[]>(STORAGE_KEYS.TRIPS, []);
    if (localTrips.length > 0) {
      console.log(`[Storage] Syncing ${localTrips.length} trips...`);
      for (const trip of localTrips) {
        const packingList = await getPackingListForTrip(trip.id);
        await supabaseHelpers.saveTrip(mapToDbTrip(trip, userId, packingList || undefined));
      }
    }

    // Sync Wear Logs
    const localLogs = await getStorageItem<WearLog[]>(STORAGE_KEYS.WEAR_LOGS, []);
    if (localLogs.length > 0) {
      console.log(`[Storage] Syncing ${localLogs.length} wear logs...`);
      for (const log of localLogs) {
        const remoteUri = log.imageUri ? await uploadIfLocal(log.imageUri, userId, "outfits") : undefined;
        const logWithRemote = { ...log, imageUri: remoteUri };
        await supabaseHelpers.saveOutfitLog(mapToDbOutfitLog(logWithRemote, userId));
      }
    }

    return { success: true, itemsCount: syncedCount };
  } catch (error) {
    console.error("[Storage] Migration error:", error);
    return { success: false, itemsCount: 0 };
  }
}

// ============ Wishlist Blend Algorithm ============

// Color compatibility matrix (simplified)
const COLOR_COMPATIBILITY: Record<string, string[]> = {
  black: ["white", "gray", "beige", "navy", "red", "pink", "gold", "silver", "cream", "tan"],
  white: ["black", "navy", "gray", "beige", "blue", "red", "pink", "green", "brown", "tan"],
  navy: ["white", "beige", "gray", "pink", "gold", "cream", "tan", "light-blue"],
  gray: ["black", "white", "navy", "pink", "blue", "red", "purple", "burgundy"],
  beige: ["black", "white", "navy", "brown", "burgundy", "green", "blue", "cream"],
  brown: ["white", "beige", "cream", "tan", "navy", "green", "burgundy", "gold"],
  blue: ["white", "gray", "beige", "tan", "brown", "navy", "cream"],
  red: ["black", "white", "gray", "navy", "beige", "cream"],
  pink: ["black", "white", "gray", "navy", "beige", "cream", "burgundy"],
  green: ["white", "beige", "brown", "tan", "cream", "navy", "gold"],
  burgundy: ["beige", "cream", "gray", "pink", "navy", "tan", "gold"],
  cream: ["black", "navy", "brown", "burgundy", "green", "tan", "beige"],
  tan: ["white", "navy", "brown", "cream", "beige", "burgundy", "green"],
  gold: ["black", "navy", "burgundy", "green", "brown", "white"],
  silver: ["black", "white", "gray", "navy", "pink", "purple"],
  purple: ["gray", "silver", "white", "beige", "cream", "pink"],
};

// Category pairing rules for outfits
const CATEGORY_PAIRINGS: Record<ClothingCategory, ClothingCategory[]> = {
  tops: ["bottoms", "outerwear", "accessories", "shoes"],
  bottoms: ["tops", "outerwear", "accessories", "shoes"],
  dresses: ["outerwear", "accessories", "shoes"],
  outerwear: ["tops", "bottoms", "dresses", "accessories", "shoes"],
  shoes: ["tops", "bottoms", "dresses", "outerwear", "accessories"],
  accessories: ["tops", "bottoms", "dresses", "outerwear", "shoes"],
  swimwear: ["accessories", "shoes"],
};

function getColorCompatibilityScore(color1: string, color2: string): number {
  const c1 = color1.toLowerCase();
  const c2 = color2.toLowerCase();

  if (c1 === c2) return 70; // Same color - decent match

  const compatibleColors = COLOR_COMPATIBILITY[c1] || [];
  if (compatibleColors.includes(c2)) return 90;

  // Check reverse
  const reverseCompatible = COLOR_COMPATIBILITY[c2] || [];
  if (reverseCompatible.includes(c1)) return 90;

  // Neutral colors always work
  const neutrals = ["black", "white", "gray", "beige", "cream", "tan"];
  if (neutrals.includes(c1) || neutrals.includes(c2)) return 75;

  return 40; // Low compatibility
}

function getOccasionOverlapScore(occasions1: Occasion[], occasions2: Occasion[]): number {
  if (occasions1.length === 0 || occasions2.length === 0) return 50;

  const overlap = occasions1.filter((o) => occasions2.includes(o));
  const overlapRatio = overlap.length / Math.min(occasions1.length, occasions2.length);

  return Math.round(overlapRatio * 100);
}

function getSeasonOverlapScore(seasons1: Season[], seasons2: Season[]): number {
  if (seasons1.length === 0 || seasons2.length === 0) return 50;

  // All-season matches everything
  if (seasons1.includes("all-season") || seasons2.includes("all-season")) return 100;

  const overlap = seasons1.filter((s) => seasons2.includes(s));
  const overlapRatio = overlap.length / Math.min(seasons1.length, seasons2.length);

  return Math.round(overlapRatio * 100);
}

export async function calculateWishlistBlend(wishlistItem: WishlistItem): Promise<WishlistBlend> {
  const closetItems = await getClothingItems();

  // Find compatible items from closet
  const compatibleCategories = CATEGORY_PAIRINGS[wishlistItem.category] || [];
  const potentialMatches = closetItems.filter((item) =>
    compatibleCategories.includes(item.category)
  );

  // Score each potential match
  const scoredMatches = potentialMatches.map((item) => {
    const colorScore = getColorCompatibilityScore(wishlistItem.color, item.color);
    const occasionScore = getOccasionOverlapScore(wishlistItem.occasions, item.occasions);
    const seasonScore = getSeasonOverlapScore(wishlistItem.seasons, item.seasons);

    // Weighted average
    const totalScore = Math.round(
      colorScore * 0.4 + occasionScore * 0.35 + seasonScore * 0.25
    );

    return { item, score: totalScore };
  });

  // Sort by score and get top matches
  scoredMatches.sort((a, b) => b.score - a.score);
  const topMatches = scoredMatches.slice(0, 10);

  // Generate outfit suggestions
  const outfitSuggestions: WishlistBlend["outfitSuggestions"] = [];

  // Create up to 3 outfit combinations
  const usedItems = new Set<string>();

  for (let i = 0; i < Math.min(3, topMatches.length); i++) {
    const outfitItems: (ClothingItem | WishlistItem)[] = [wishlistItem];
    let outfitScore = 0;
    let itemCount = 1;

    // Add compatible items from different categories
    for (const match of topMatches) {
      if (usedItems.has(match.item.id)) continue;

      // Check if this category is already in the outfit
      const existingCategories = outfitItems.map((oi) =>
        "purchasePrice" in oi ? oi.category : (oi as WishlistItem).category
      );

      if (!existingCategories.includes(match.item.category)) {
        outfitItems.push(match.item);
        outfitScore += match.score;
        itemCount++;
        usedItems.add(match.item.id);

        if (outfitItems.length >= 4) break; // Max 4 items per outfit
      }
    }

    if (outfitItems.length >= 2) {
      outfitSuggestions.push({
        id: generateId(),
        items: outfitItems,
        score: Math.round(outfitScore / (itemCount - 1)), // Average score of closet items
      });
    }
  }

  // Calculate overall compatibility score
  const overallScore = topMatches.length > 0
    ? Math.round(topMatches.slice(0, 5).reduce((sum, m) => sum + m.score, 0) / Math.min(5, topMatches.length))
    : 0;

  return {
    wishlistItemId: wishlistItem.id,
    compatibleItems: topMatches.map((m) => m.item),
    outfitSuggestions,
    overallScore,
  };
}

export function getBlendScoreLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Perfect Match", color: "#22C55E" };
  if (score >= 70) return { label: "Great Fit", color: "#84CC16" };
  if (score >= 55) return { label: "Good Addition", color: "#EAB308" };
  if (score >= 40) return { label: "Moderate Fit", color: "#F97316" };
  return { label: "Low Match", color: "#EF4444" };
}

/**
 * Attempts to fix broken image URIs in the database by uploading local files
 * that haven't been synced yet.
 */
export async function cleanupBrokenImages(): Promise<{ fixed: number; failed: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { fixed: 0, failed: 0 };

  const userId = session.user.id;
  let fixedCount = 0;
  let failedCount = 0;

  try {
    // Check Clothing Items
    const items = await getClothingItems();
    for (const item of items) {
      if (supabaseHelpers.isLocalUri(item.imageUri)) {
        try {
          const remoteUri = await uploadIfLocal(item.imageUri, userId, "clothing");
          if (remoteUri !== item.imageUri) {
            await saveClothingItem({ ...item, imageUri: remoteUri });
            fixedCount++;
          } else {
            failedCount++;
          }
        } catch (e) {
          failedCount++;
        }
      }
    }

    // Check Wear Logs
    const logs = await getWearLogs();
    for (const log of logs) {
      if (log.imageUri && supabaseHelpers.isLocalUri(log.imageUri)) {
        try {
          const remoteUri = await uploadIfLocal(log.imageUri, userId, "outfits");
          if (remoteUri !== log.imageUri) {
            await saveWearLog({ ...log, imageUri: remoteUri });
            fixedCount++;
          } else {
            failedCount++;
          }
        } catch (e) {
          failedCount++;
        }
      }
    }

    // Check Wishlist
    const wishlist = await getWishlistItems();
    for (const item of wishlist) {
      if (supabaseHelpers.isLocalUri(item.imageUri)) {
        try {
          const remoteUri = await uploadIfLocal(item.imageUri, userId, "clothing");
          if (remoteUri !== item.imageUri) {
            await saveWishlistItem({ ...item, imageUri: remoteUri });
            fixedCount++;
          } else {
            failedCount++;
          }
        } catch (e) {
          failedCount++;
        }
      }
    }

    return { fixed: fixedCount, failed: failedCount };
  } catch (error) {
    console.error("[Storage] Cleanup error:", error);
    return { fixed: fixedCount, failed: failedCount };
  }
}
