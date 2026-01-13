import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getClothingItems, type ClothingItem } from "@/lib/storage";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TryOnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ itemId?: string }>();
  const colors = useColors();

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fitResult, setFitResult] = useState<{
    overallFit: string;
    sizeRecommendation?: string;
    stylingTips?: string[];
    fitIssues?: string[];
    visualDescription?: string;
  } | null>(null);

  const tryOnMutation = trpc.tryOn.generateTryOn.useMutation();

  useEffect(() => {
    loadClosetItems();
  }, []);

  useEffect(() => {
    if (params.itemId && closetItems.length > 0) {
      const item = closetItems.find((i) => i.id === params.itemId);
      if (item) setSelectedItem(item);
    }
  }, [params.itemId, closetItems]);

  const loadClosetItems = async () => {
    const items = await getClothingItems();
    setClosetItems(items);
  };

  const pickUserPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUserPhoto(result.assets[0].uri);
      setFitResult(null);
    }
  };

  const takeUserPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUserPhoto(result.assets[0].uri);
      setFitResult(null);
    }
  };

  const analyzeFit = async () => {
    if (!userPhoto || !selectedItem) {
      Alert.alert("Missing Info", "Please add your photo and select an item.");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Convert images to base64
      const userBase64 = await FileSystem.readAsStringAsync(userPhoto, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let garmentBase64 = "";
      if (selectedItem.imageUri.startsWith("file://")) {
        garmentBase64 = await FileSystem.readAsStringAsync(selectedItem.imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // For remote URLs, we'd need to download first
        garmentBase64 = selectedItem.imageUri;
      }

      const result = await tryOnMutation.mutateAsync({
        userAvatarBase64: userBase64,
        garmentImageBase64: garmentBase64,
        garmentCategory: selectedItem.category,
        garmentMeasurements: selectedItem.measurements,
      });

      if (result.success) {
        setFitResult({
          overallFit: result.overallFit || "unknown",
          sizeRecommendation: result.sizeRecommendation,
          stylingTips: result.stylingTips,
          fitIssues: result.fitIssues,
          visualDescription: result.visualDescription,
        });
      } else {
        Alert.alert("Analysis Failed", result.error || "Could not analyze fit.");
      }
    } catch (error) {
      console.error("Try-on error:", error);
      Alert.alert("Error", "Failed to analyze fit. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFitColor = (fit: string) => {
    switch (fit.toLowerCase()) {
      case "perfect":
        return colors.success;
      case "good":
        return "#22C55E";
      case "acceptable":
        return colors.warning;
      case "tight":
      case "slightly-small":
        return "#F59E0B";
      case "poor":
      case "too-small":
      case "too-large":
        return colors.error;
      default:
        return colors.muted;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Virtual Try-On</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Photo Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Photo</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Upload a full-body photo for accurate fit analysis
          </Text>

          {userPhoto ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: userPhoto }} style={styles.userPhoto} />
              <TouchableOpacity
                style={[styles.changePhotoButton, { backgroundColor: colors.surface }]}
                onPress={pickUserPhoto}
              >
                <Text style={[styles.changePhotoText, { color: colors.foreground }]}>
                  Change Photo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoOptions}>
              <TouchableOpacity
                style={[styles.photoOption, { backgroundColor: colors.surface }]}
                onPress={takeUserPhoto}
              >
                <IconSymbol name="camera.fill" size={32} color={colors.primary} />
                <Text style={[styles.photoOptionText, { color: colors.foreground }]}>
                  Take Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoOption, { backgroundColor: colors.surface }]}
                onPress={pickUserPhoto}
              >
                <IconSymbol name="photo.fill" size={32} color={colors.primary} />
                <Text style={[styles.photoOptionText, { color: colors.foreground }]}>
                  From Gallery
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Select Item Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Item</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Choose an item from your closet to try on
          </Text>

          {selectedItem ? (
            <View style={[styles.selectedItemCard, { backgroundColor: colors.surface }]}>
              <Image source={{ uri: selectedItem.imageUri }} style={styles.selectedItemImage} />
              <View style={styles.selectedItemInfo}>
                <Text style={[styles.selectedItemName, { color: colors.foreground }]}>
                  {selectedItem.name || `${selectedItem.brand} ${selectedItem.type}`}
                </Text>
                <Text style={[styles.selectedItemDetails, { color: colors.muted }]}>
                  {selectedItem.category} • {selectedItem.color}
                </Text>
                {selectedItem.measurements?.sizeLabel && (
                  <Text style={[styles.selectedItemSize, { color: colors.primary }]}>
                    Size: {selectedItem.measurements.sizeLabel}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
              {closetItems.length > 0 ? (
                closetItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemCard, { backgroundColor: colors.surface }]}
                    onPress={() => setSelectedItem(item)}
                  >
                    <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
                    <Text
                      style={[styles.itemName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.brand || item.type}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    No items in closet. Add some first!
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            {
              backgroundColor: userPhoto && selectedItem ? colors.foreground : colors.border,
            },
          ]}
          onPress={analyzeFit}
          disabled={!userPhoto || !selectedItem || isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.analyzeButtonText, { color: colors.background }]}>
              Analyze Fit
            </Text>
          )}
        </TouchableOpacity>

        {/* Results Section */}
        {fitResult && (
          <View style={[styles.resultsSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.resultsTitle, { color: colors.foreground }]}>Fit Analysis</Text>

            {/* Overall Fit Badge */}
            <View style={styles.fitBadgeContainer}>
              <View
                style={[styles.fitBadge, { backgroundColor: getFitColor(fitResult.overallFit) }]}
              >
                <Text style={styles.fitBadgeText}>
                  {fitResult.overallFit.replace("-", " ").toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Size Recommendation */}
            {fitResult.sizeRecommendation && (
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.muted }]}>
                  Size Recommendation
                </Text>
                <Text style={[styles.resultValue, { color: colors.foreground }]}>
                  {fitResult.sizeRecommendation}
                </Text>
              </View>
            )}

            {/* Visual Description */}
            {fitResult.visualDescription && (
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.muted }]}>How It Would Look</Text>
                <Text style={[styles.resultDescription, { color: colors.foreground }]}>
                  {fitResult.visualDescription}
                </Text>
              </View>
            )}

            {/* Fit Issues */}
            {fitResult.fitIssues && fitResult.fitIssues.length > 0 && (
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.muted }]}>Things to Note</Text>
                {fitResult.fitIssues.map((issue, index) => (
                  <View key={index} style={styles.issueRow}>
                    <Text style={[styles.issueBullet, { color: colors.warning }]}>•</Text>
                    <Text style={[styles.issueText, { color: colors.foreground }]}>{issue}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Styling Tips */}
            {fitResult.stylingTips && fitResult.stylingTips.length > 0 && (
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.muted }]}>Styling Tips</Text>
                {fitResult.stylingTips.map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <Text style={[styles.tipBullet, { color: colors.success }]}>✓</Text>
                    <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Georgia",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  photoContainer: {
    alignItems: "center",
  },
  userPhoto: {
    width: 200,
    height: 267,
    borderRadius: 16,
    marginBottom: 12,
  },
  changePhotoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  photoOptions: {
    flexDirection: "row",
    gap: 16,
  },
  photoOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 16,
    gap: 8,
  },
  photoOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  selectedItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectedItemDetails: {
    fontSize: 13,
    marginTop: 2,
  },
  selectedItemSize: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  itemsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  itemCard: {
    width: 100,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  itemImage: {
    width: 100,
    height: 100,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "500",
    padding: 8,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  analyzeButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 24,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  resultsSection: {
    padding: 20,
    borderRadius: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Georgia",
    marginBottom: 16,
    textAlign: "center",
  },
  fitBadgeContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  fitBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  fitBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  resultItem: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  resultDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  issueBullet: {
    fontSize: 16,
    marginRight: 8,
  },
  issueText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  tipBullet: {
    fontSize: 14,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
