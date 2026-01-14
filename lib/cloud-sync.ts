import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ClothingItem,
  Outfit,
  WearLog,
  WishlistItem,
  Trip,
  PackingList,
  getClothingItems,
  getOutfits,
  getWearLogs,
  getWishlistItems,
  getTrips,
  getPackingLists,
  saveClothingItem as saveLocalClothingItem,
  saveOutfit as saveLocalOutfit,
  saveWearLog as saveLocalWearLog,
  saveWishlistItem as saveLocalWishlistItem,
  saveTrip as saveLocalTrip,
  savePackingList as saveLocalPackingList,
} from "./storage";
import {
  supabaseHelpers,
  DbClothingItem,
  DbOutfit,
  DbWishlistItem,
  DbTrip,
  DbOutfitLog,
} from "./supabase";

// Storage keys for sync metadata
const SYNC_KEYS = {
  LAST_SYNC: "fitcheck_last_sync",
  SYNC_STATUS: "fitcheck_sync_status",
  PENDING_CHANGES: "fitcheck_pending_changes",
};

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncState {
  lastSync: string | null;
  status: SyncStatus;
  error: string | null;
  pendingChanges: number;
}

export interface CloudData {
  clothingItems: ClothingItem[];
  outfits: Outfit[];
  wearLogs: WearLog[];
  wishlistItems: WishlistItem[];
  trips: Trip[];
  packingLists: PackingList[];
  syncedAt: string;
}

// Get current sync state
export async function getSyncState(): Promise<SyncState> {
  try {
    const lastSync = await AsyncStorage.getItem(SYNC_KEYS.LAST_SYNC);
    const status = (await AsyncStorage.getItem(SYNC_KEYS.SYNC_STATUS)) as SyncStatus || "idle";
    const pendingChanges = parseInt(await AsyncStorage.getItem(SYNC_KEYS.PENDING_CHANGES) || "0", 10);
    
    return {
      lastSync,
      status,
      error: null,
      pendingChanges,
    };
  } catch (error) {
    return {
      lastSync: null,
      status: "error",
      error: "Failed to get sync state",
      pendingChanges: 0,
    };
  }
}

// Mark a change as pending sync
export async function markPendingChange(): Promise<void> {
  try {
    const current = parseInt(await AsyncStorage.getItem(SYNC_KEYS.PENDING_CHANGES) || "0", 10);
    await AsyncStorage.setItem(SYNC_KEYS.PENDING_CHANGES, String(current + 1));
  } catch (error) {
    console.error("[CloudSync] Failed to mark pending change:", error);
  }
}

// Clear pending changes after successful sync
async function clearPendingChanges(): Promise<void> {
  await AsyncStorage.setItem(SYNC_KEYS.PENDING_CHANGES, "0");
}

// Set sync status
async function setSyncStatus(status: SyncStatus): Promise<void> {
  await AsyncStorage.setItem(SYNC_KEYS.SYNC_STATUS, status);
}

// Collect all local data for upload
export async function collectLocalData(): Promise<CloudData> {
  const [clothingItems, outfits, wearLogs, wishlistItems, trips, packingLists] = await Promise.all([
    getClothingItems(),
    getOutfits(),
    getWearLogs(),
    getWishlistItems(),
    getTrips(),
    getPackingLists(),
  ]);

  return {
    clothingItems,
    outfits,
    wearLogs,
    wishlistItems,
    trips,
    packingLists,
    syncedAt: new Date().toISOString(),
  };
}

// Upload local data to cloud
export async function uploadToCloud(user: { id: number; openId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await setSyncStatus("syncing");
    
    const localData = await collectLocalData();
    const userId = user.openId; // Use openId for Supabase foreign keys

    console.log("[CloudSync] Uploading data for user:", userId);

    // 1. Upload Clothing Items
    for (const item of localData.clothingItems) {
      const dbItem: Omit<DbClothingItem, "created_at" | "updated_at"> = {
        id: item.id,
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
        is_favorite: item.isFavorite || false,
        notes: "",
      };
      await supabaseHelpers.saveClothingItem(dbItem);
    }

    // 2. Upload Outfits
    for (const outfit of localData.outfits) {
      const dbOutfit: DbOutfit = {
        id: outfit.id,
        user_id: userId,
        name: outfit.name,
        item_ids: outfit.itemIds,
        mood: outfit.mood,
        occasions: outfit.occasions,
        is_from_ai: outfit.isFromAI,
        created_at: outfit.createdAt,
      };
      await supabaseHelpers.saveOutfit(dbOutfit);
    }

    // 3. Upload Wishlist Items
    for (const item of localData.wishlistItems) {
      const dbItem: DbWishlistItem = {
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
      await supabaseHelpers.saveWishlistItem(dbItem);
    }

    // 4. Upload Trips
    for (const trip of localData.trips) {
      const packingList = localData.packingLists.find(l => l.tripId === trip.id);
      
      const dbTrip: DbTrip = {
        id: trip.id,
        user_id: userId,
        name: trip.name,
        destination: trip.destination,
        start_date: trip.startDate,
        end_date: trip.endDate,
        climate: trip.climate,
        occasions: [], 
        packing_list: packingList ? packingList.items.map(i => i.id) : [],
        is_packed: false,
        created_at: trip.createdAt,
      };
      await supabaseHelpers.saveTrip(dbTrip);
    }

    // 5. Upload Wear Logs
    for (const log of localData.wearLogs) {
      const dbLog: DbOutfitLog = {
        id: log.id,
        user_id: userId,
        date: log.date,
        outfit_id: log.outfitId,
        item_ids: log.itemIds,
        notes: log.notes,
        photo_uri: log.imageUri,
        created_at: new Date().toISOString(),
      };
      await supabaseHelpers.saveOutfitLog(dbLog);
    }

    await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, new Date().toISOString());
    await clearPendingChanges();
    await setSyncStatus("success");

    return { success: true };
  } catch (error) {
    await setSyncStatus("error");
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CloudSync] Upload failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Download data from cloud and merge with local
export async function downloadFromCloud(user: { id: number; openId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await setSyncStatus("syncing");
    console.log("[CloudSync] Downloading data for user:", user.openId);
    
    // 1. Download Clothing Items
    const cloudItems = await supabaseHelpers.getClothingItems();
    for (const dbItem of cloudItems) {
      const item: ClothingItem = {
        id: dbItem.id,
        imageUri: dbItem.image_uri,
        category: dbItem.category as any,
        type: dbItem.type,
        color: dbItem.color,
        brand: dbItem.brand || "",
        purchasePrice: dbItem.purchase_price,
        tags: [],
        occasions: dbItem.occasions as any[],
        seasons: dbItem.seasons as any[],
        wearCount: dbItem.wear_count,
        lastWornAt: dbItem.last_worn,
        isFavorite: dbItem.is_favorite,
        createdAt: dbItem.created_at,
      };
      await saveLocalClothingItem(item);
    }

    // 2. Download Outfits
    const cloudOutfits = await supabaseHelpers.getOutfits();
    for (const dbOutfit of cloudOutfits) {
      const outfit: Outfit = {
        id: dbOutfit.id,
        name: dbOutfit.name,
        itemIds: dbOutfit.item_ids,
        mood: dbOutfit.mood,
        occasions: dbOutfit.occasions as any[],
        createdAt: dbOutfit.created_at,
        isFromAI: dbOutfit.is_from_ai,
      };
      await saveLocalOutfit(outfit);
    }

    // 3. Download Wishlist
    const cloudWishlist = await supabaseHelpers.getWishlistItems();
    for (const dbItem of cloudWishlist) {
      const item: WishlistItem = {
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
        addedAt: dbItem.added_at,
        isPriority: dbItem.is_priority,
      };
      await saveLocalWishlistItem(item);
    }

    // 4. Download Trips
    const cloudTrips = await supabaseHelpers.getTrips();
    for (const dbTrip of cloudTrips) {
      const trip: Trip = {
        id: dbTrip.id,
        name: dbTrip.name,
        destination: dbTrip.destination,
        startDate: dbTrip.start_date,
        endDate: dbTrip.end_date,
        tripType: "other" as any, 
        climate: dbTrip.climate as any,
        activities: [],
        createdAt: dbTrip.created_at,
      };
      await saveLocalTrip(trip);
    }

    // 5. Download Wear Logs
    const cloudLogs = await supabaseHelpers.getOutfitLogs();
    for (const dbLog of cloudLogs) {
      const log: WearLog = {
        id: dbLog.id,
        date: dbLog.date,
        itemIds: dbLog.item_ids,
        outfitId: dbLog.outfit_id,
        sharedToCommunity: false,
        imageUri: dbLog.photo_uri,
        notes: dbLog.notes,
      };
      await saveLocalWearLog(log);
    }

    await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, new Date().toISOString());
    await setSyncStatus("success");

    return { success: true };
  } catch (error) {
    await setSyncStatus("error");
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CloudSync] Download failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Perform full sync (upload then download)
export async function performFullSync(user: { id: number; openId: string }): Promise<{ success: boolean; error?: string }> {
  const uploadResult = await uploadToCloud(user);
  if (!uploadResult.success) {
    return uploadResult;
  }

  const downloadResult = await downloadFromCloud(user);
  return downloadResult;
}

// Format last sync time for display
export function formatLastSync(lastSync: string | null): string {
  if (!lastSync) return "Never synced";
  
  const syncDate = new Date(lastSync);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return syncDate.toLocaleDateString();
}
