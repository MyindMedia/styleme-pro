import { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  WearLog,
  ClothingItem,
  getWearLogs,
  getClothingItems,
  generateId,
} from "@/lib/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SELFIE_STORAGE_KEY = "fitcheck_outfit_selfies";

export interface OutfitSelfie {
  id: string;
  imageUri: string;
  wearLogId?: string;
  date: string;
  notes?: string;
  location?: string;
  createdAt: string;
}

// Storage functions for selfies
async function getSelfies(): Promise<OutfitSelfie[]> {
  try {
    const data = await AsyncStorage.getItem(SELFIE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveSelfie(selfie: OutfitSelfie): Promise<void> {
  const selfies = await getSelfies();
  selfies.unshift(selfie);
  await AsyncStorage.setItem(SELFIE_STORAGE_KEY, JSON.stringify(selfies));
}

export default function SelfieCaptureScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ wearLogId?: string; date?: string }>();
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wearLog, setWearLog] = useState<WearLog | null>(null);
  const [outfitItems, setOutfitItems] = useState<ClothingItem[]>([]);
  const [notes, setNotes] = useState("");

  // Load wear log data if provided
  useEffect(() => {
    const loadWearLog = async () => {
      if (params.wearLogId) {
        const logs = await getWearLogs();
        const log = logs.find(l => l.id === params.wearLogId);
        if (log) {
          setWearLog(log);
          const items = await getClothingItems();
          const logItems = items.filter(item => log.itemIds.includes(item.id));
          setOutfitItems(logItems);
        }
      }
    };
    loadWearLog();
  }, [params.wearLogId]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    
    if (cameraStatus !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please enable camera access in your device settings to take outfit selfies."
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Error", "Failed to select photo. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!imageUri) {
      Alert.alert("No Photo", "Please take or select a photo first.");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const selfie: OutfitSelfie = {
        id: generateId(),
        imageUri,
        wearLogId: params.wearLogId,
        date: params.date || new Date().toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await saveSelfie(selfie);

      // Save to device gallery
      if (Platform.OS !== "web") {
        try {
          await MediaLibrary.saveToLibraryAsync(imageUri);
        } catch (e) {
          console.log("Could not save to gallery:", e);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Selfie Saved!",
        "Your outfit selfie has been added to your style diary.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save selfie. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImageUri(null);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialIcons name="close" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Outfit Selfie
        </Text>
        {imageUri ? (
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: colors.primary,
                opacity: isSaving ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.saveText, { color: colors.background }]}>Save</Text>
            )}
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {imageUri ? (
          // Photo Preview
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
            <Pressable
              onPress={handleRetake}
              style={[styles.retakeButton, { backgroundColor: colors.surface }]}
            >
              <MaterialIcons name="refresh" size={20} color={colors.foreground} />
              <Text style={[styles.retakeText, { color: colors.foreground }]}>Retake</Text>
            </Pressable>
          </View>
        ) : (
          // Camera View
          <View style={styles.cameraContainer}>
            <View style={[styles.cameraPlaceholder, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="person" size={80} color={colors.muted} />
              <Text style={[styles.placeholderText, { color: colors.muted }]}>
                Strike a pose!
              </Text>
            </View>

            {/* Outfit Preview */}
            {outfitItems.length > 0 && (
              <View style={[styles.outfitPreview, { backgroundColor: colors.surface }]}>
                <Text style={[styles.outfitLabel, { color: colors.foreground }]}>
                  Today's Outfit
                </Text>
                <View style={styles.outfitItems}>
                  {outfitItems.slice(0, 4).map((item, index) => (
                    <Image
                      key={item.id}
                      source={{ uri: item.imageUri }}
                      style={styles.outfitItemImage}
                      contentFit="cover"
                    />
                  ))}
                  {outfitItems.length > 4 && (
                    <View style={[styles.moreItems, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.moreItemsText, { color: colors.background }]}>
                        +{outfitItems.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Capture Buttons */}
            <View style={styles.captureActions}>
              <Pressable
                onPress={pickFromGallery}
                style={({ pressed }) => [
                  styles.galleryButton,
                  { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialIcons name="photo-library" size={24} color={colors.foreground} />
              </Pressable>

              <Pressable
                onPress={takePhoto}
                disabled={isCapturing}
                style={({ pressed }) => [
                  styles.captureButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isCapturing ? 0.5 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {isCapturing ? (
                  <ActivityIndicator size="large" color={colors.background} />
                ) : (
                  <MaterialIcons name="camera-alt" size={36} color={colors.background} />
                )}
              </Pressable>

              <View style={styles.placeholderButton} />
            </View>
          </View>
        )}

        {/* Tips */}
        {!imageUri && (
          <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="lightbulb" size={20} color={colors.warning} />
            <View style={styles.tipsContent}>
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>
                Selfie Tips
              </Text>
              <Text style={[styles.tipsText, { color: colors.muted }]}>
                • Use natural lighting for best results{"\n"}
                • Stand in front of a plain background{"\n"}
                • Show your full outfit from head to toe
              </Text>
            </View>
          </View>
        )}

        {/* Date Badge */}
        <View style={[styles.dateBadge, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="calendar-today" size={16} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {params.date
              ? new Date(params.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  saveText: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  cameraContainer: {
    flex: 1,
    gap: 16,
  },
  cameraPlaceholder: {
    flex: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: "600",
  },
  outfitPreview: {
    padding: 16,
    borderRadius: 16,
  },
  outfitLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  outfitItems: {
    flexDirection: "row",
    gap: 8,
  },
  outfitItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  moreItems: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moreItemsText: {
    fontSize: 14,
    fontWeight: "700",
  },
  captureActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    paddingVertical: 16,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderButton: {
    width: 56,
    height: 56,
  },
  previewContainer: {
    flex: 1,
    position: "relative",
  },
  previewImage: {
    flex: 1,
    borderRadius: 24,
  },
  retakeButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  retakeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tipsCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginTop: 16,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginTop: 16,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
