import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "./trpc";
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
} from "./storage";

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
export async function uploadToCloud(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await setSyncStatus("syncing");
    
    const localData = await collectLocalData();
    
    // Note: This would call a tRPC endpoint to save data
    // For now, we'll simulate the upload
    console.log("[CloudSync] Uploading data for user:", userId);
    console.log("[CloudSync] Items to sync:", {
      clothingItems: localData.clothingItems.length,
      outfits: localData.outfits.length,
      wearLogs: localData.wearLogs.length,
      wishlistItems: localData.wishlistItems.length,
      trips: localData.trips.length,
      packingLists: localData.packingLists.length,
    });

    // TODO: Implement actual tRPC call when backend sync endpoint is ready
    // await trpc.sync.upload.mutate({ data: localData });

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
export async function downloadFromCloud(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await setSyncStatus("syncing");
    
    console.log("[CloudSync] Downloading data for user:", userId);
    
    // TODO: Implement actual tRPC call when backend sync endpoint is ready
    // const cloudData = await trpc.sync.download.query();
    
    // For now, we'll just mark sync as complete
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
export async function performFullSync(userId: number): Promise<{ success: boolean; error?: string }> {
  const uploadResult = await uploadToCloud(userId);
  if (!uploadResult.success) {
    return uploadResult;
  }

  const downloadResult = await downloadFromCloud(userId);
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
