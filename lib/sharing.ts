import { Linking, Platform, Alert } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

export async function shareToInstagramStories(imageUri: string) {
  try {
    // 1. Check if Instagram is installed (iOS only for custom scheme)
    if (Platform.OS === "ios") {
      const canOpen = await Linking.canOpenURL("instagram-stories://share");
      if (!canOpen) {
        // Fallback to standard share sheet
        await Sharing.shareAsync(imageUri);
        return;
      }
    }

    // 2. Prepare for Instagram Stories
    // Instagram expects a specific pasteboard format or file scheme
    // For simplicity in Expo Go/Dev Client, standard sharing often works best
    // But we'll try the specific scheme if possible
    
    if (Platform.OS === "ios") {
        // iOS specific flow using standard share for now as deep linking image data
        // requires native modules not available in standard Expo Go without config plugins
        // We'll use the standard share sheet which includes "Stories" option if installed
        await Sharing.shareAsync(imageUri, {
            UTI: "com.instagram.exclusivegram.file", // Helps prioritize IG
            mimeType: "image/png",
            dialogTitle: "Share to Instagram Stories"
        });
    } else {
        // Android
        await Sharing.shareAsync(imageUri, {
            mimeType: "image/png",
            dialogTitle: "Share to Instagram Stories"
        });
    }

  } catch (error) {
    console.error("Error sharing to Instagram:", error);
    Alert.alert("Share Error", "Could not share image. Please try again.");
  }
}
