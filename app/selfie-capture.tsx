import { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  FlatList,
  Platform,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import ViewShot, { captureRef } from "react-native-view-shot";

import { useColors } from "@/hooks/use-colors";
import { 
  getClothingItems, 
  saveWearLog, 
  generateId, 
  ClothingItem, 
  WearLog, 
  MoodTag 
} from "@/lib/storage";
import { shareToInstagramStories } from "@/lib/sharing";
import { ShareTemplate } from "@/components/share-template";

const MOOD_TAGS: { tag: MoodTag; emoji: string; label: string }[] = [
  { tag: "confident", emoji: "💪", label: "Confident" },
  { tag: "comfortable", emoji: "😌", label: "Comfortable" },
  { tag: "stylish", emoji: "✨", label: "Stylish" },
  { tag: "casual", emoji: "👕", label: "Casual" },
  { tag: "professional", emoji: "💼", label: "Professional" },
  { tag: "creative", emoji: "🎨", label: "Creative" },
  { tag: "cozy", emoji: "🧣", label: "Cozy" },
  { tag: "bold", emoji: "🔥", label: "Bold" },
  { tag: "minimal", emoji: "⚪", label: "Minimal" },
  { tag: "elegant", emoji: "👗", label: "Elegant" },
];

export default function SelfieCaptureScreen() {
  const router = useRouter();
  const colors = useColors();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [step, setStep] = useState<"camera" | "preview" | "tagging">("camera");

  // Tagging State
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<MoodTag[]>([]);
  const [notes, setNotes] = useState("");
  
  const shareRef = useRef<ViewShot>(null);

  useEffect(() => {
    loadCloset();
  }, []);

  const loadCloset = async () => {
    const items = await getClothingItems();
    setClosetItems(items);
  };

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: colors.foreground, marginBottom: 20 }}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleTimer = () => {
    if (timer === 0) setTimer(3);
    else if (timer === 3) setTimer(10);
    else setTimer(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    if (timer > 0) {
      let count = timer;
      setCountdown(count);
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) {
          clearInterval(interval);
          setCountdown(null);
          performCapture();
        }
      }, 1000);
    } else {
      performCapture();
    }
  };

  const performCapture = async () => {
    if (!cameraRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo) {
        setCapturedImage(photo.uri);
        setStep("preview");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to take picture");
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setStep("camera");
    setSelectedItems([]);
    setSelectedMoods([]);
    setNotes("");
  };

  const handleConfirmPhoto = () => {
    setStep("tagging");
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleMoodSelection = (tag: MoodTag) => {
    setSelectedMoods((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!capturedImage) return;

    try {
      // 1. Save photo to gallery (optional, but good UX)
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await MediaLibrary.saveToLibraryAsync(capturedImage);
      }

      // 2. Create WearLog
      const newLog: WearLog = {
        id: generateId(),
        date: new Date().toISOString(),
        itemIds: selectedItems,
        sharedToCommunity: false,
        imageUri: capturedImage,
        notes: notes || undefined,
        moodTags: selectedMoods.length > 0 ? selectedMoods : undefined,
      };

      await saveWearLog(newLog);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", "Your fit check has been logged.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/tracker") }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save outfit");
    }
  };

  if (step === "camera") {
    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <SafeAreaView style={styles.cameraUi}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <MaterialIcons name="close" size={28} color="white" />
              </TouchableOpacity>
              <View style={styles.watermarkContainer}>
                <Text style={styles.watermarkText}>FIT CHECK</Text>
              </View>
              <TouchableOpacity onPress={toggleTimer} style={styles.iconButton}>
                <MaterialIcons name={timer === 0 ? "timer-off" : timer === 3 ? "timer-3" : "timer-10"} size={28} color={timer > 0 ? colors.primary : "white"} />
              </TouchableOpacity>
            </View>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
              <View style={{ width: 40 }} /> 
              <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
                <MaterialIcons name="flip-camera-ios" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  if (step === "preview" && capturedImage) {
    return (
      <View style={[styles.container, { backgroundColor: "black" }]}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="cover" />
        <SafeAreaView style={styles.previewUi}>
          <View style={styles.previewActions}>
            <TouchableOpacity onPress={handleRetake} style={styles.previewButton}>
              <MaterialIcons name="refresh" size={24} color="white" />
              <Text style={styles.previewButtonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirmPhoto} style={[styles.previewButton, { backgroundColor: colors.primary, borderRadius: 30, paddingHorizontal: 20 }]}>
              <Text style={[styles.previewButtonText, { color: "white" }]}>Tag Items</Text>
              <MaterialIcons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Tagging Step
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderShareTemplate()}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep("preview")} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tag Your Fit</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={closetItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.miniPreviewContainer}>
                <Image source={{ uri: capturedImage! }} style={styles.miniPreview} />
                <View style={styles.moodSection}>
                   <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vibe</Text>
                   <FlatList 
                      data={MOOD_TAGS}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={item => item.tag}
                      contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          onPress={() => toggleMoodSelection(item.tag)}
                          style={[
                            styles.moodChip, 
                            { 
                              backgroundColor: selectedItems.includes(item.tag) ? colors.primary : colors.surface,
                              borderColor: colors.border,
                              borderWidth: 1
                            },
                            selectedMoods.includes(item.tag) && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                        >
                          <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                          <Text style={[
                            styles.moodLabel, 
                            { color: selectedMoods.includes(item.tag) ? "white" : colors.foreground }
                          ]}>{item.label}</Text>
                        </TouchableOpacity>
                      )}
                   />
                </View>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginHorizontal: 16, marginBottom: 12 }]}>
                What are you wearing?
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => toggleItemSelection(item.id)}
              style={[
                styles.gridItem,
                selectedItems.includes(item.id) && { borderColor: colors.primary, borderWidth: 3 }
              ]}
            >
              <ExpoImage source={{ uri: item.imageUri }} style={styles.gridImage} contentFit="cover" />
              {selectedItems.includes(item.id) && (
                <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="check" size={12} color="white" />
                </View>
              )}
            </TouchableOpacity>
          )}
        />

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={selectedItems.length === 0}
            style={[
              styles.saveButton, 
              { backgroundColor: selectedItems.length > 0 ? colors.primary : colors.muted }
            ]}
          >
            <Text style={styles.saveButtonText}>Log Outfit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraUi: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 30,
    paddingBottom: 50,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  iconButton: {
    padding: 8,
  },
  watermarkContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  watermarkText: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 2,
    fontSize: 12,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  countdownText: {
    fontSize: 120,
    fontWeight: "bold",
    color: "white",
  },
  previewImage: {
    flex: 1,
  },
  previewUi: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  previewButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  backButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  miniPreviewContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 16,
  },
  miniPreview: {
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  moodSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  gridItem: {
    flex: 1/3,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: "white", // Should be dynamic based on theme, but keeping simple for now
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});
