import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system/legacy";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ClothingItem, getClothingItems, saveClothingItem } from "@/lib/storage";
import { trpc } from "@/lib/trpc";

type ProcessingStatus = "pending" | "processing" | "success" | "error";

interface ProcessableItem extends ClothingItem {
  status: ProcessingStatus;
  selected: boolean;
  errorMessage?: string;
  processedImageUri?: string;
}

export default function BulkProcessScreen() {
  const colors = useColors();
  const router = useRouter();
  const [items, setItems] = useState<ProcessableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  // tRPC mutations
  const bulkRemoveBg = trpc.imageProcessing.bulkRemoveBackground.useMutation();
  const checkCredits = trpc.imageProcessing.checkCredits.useQuery(undefined, {
    enabled: true,
  });

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (checkCredits.data?.success && checkCredits.data.credits) {
      setCredits(checkCredits.data.credits.total);
    }
  }, [checkCredits.data]);

  const loadItems = async () => {
    try {
      const data = await getClothingItems();
      // Filter items that have images and haven't been processed
      const processable = data
        .filter((item) => item.imageUri && !item.imageUri.includes("transparent"))
        .map((item) => ({
          ...item,
          status: "pending" as ProcessingStatus,
          selected: false,
        }));
      setItems(processable);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAll = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const allSelected = items.every((item) => item.selected);
    setItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected }))
    );
  };

  const selectedCount = items.filter((item) => item.selected).length;

  const processSelected = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select items to process.");
      return;
    }

    if (credits !== null && selectedItems.length > credits) {
      Alert.alert(
        "Insufficient Credits",
        `You have ${credits} credits but selected ${selectedItems.length} items. Please select fewer items or add more credits.`
      );
      return;
    }

    setProcessing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Mark selected items as processing
    setItems((prev) =>
      prev.map((item) =>
        item.selected ? { ...item, status: "processing" } : item
      )
    );

    try {
      // Prepare images for bulk processing
      const imagesToProcess = await Promise.all(
        selectedItems.map(async (item) => {
          let imageBase64 = "";
          
          if (item.imageUri.startsWith("data:")) {
            imageBase64 = item.imageUri.split(",")[1];
          } else if (item.imageUri.startsWith("file://") || item.imageUri.startsWith("/")) {
            const base64 = await FileSystem.readAsStringAsync(item.imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            imageBase64 = base64;
          } else {
            // URL - fetch and convert
            const response = await fetch(item.imageUri);
            const blob = await response.blob();
            const reader = new FileReader();
            imageBase64 = await new Promise((resolve) => {
              reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(",")[1]);
              };
              reader.readAsDataURL(blob);
            });
          }

          return {
            id: item.id,
            imageBase64,
            mimeType: "image/jpeg",
          };
        })
      );

      // Process in batches of 10
      const batchSize = 10;
      for (let i = 0; i < imagesToProcess.length; i += batchSize) {
        const batch = imagesToProcess.slice(i, i + batchSize);
        
        const result = await bulkRemoveBg.mutateAsync({
          images: batch,
          size: "auto",
        });

        // Update items with results
        for (const processedResult of result.results) {
          setItems((prev) =>
            prev.map((item) => {
              if (item.id === processedResult.id) {
                if (processedResult.success && processedResult.processedImageBase64) {
                  // Save the processed image
                  const newImageUri = `data:image/png;base64,${processedResult.processedImageBase64}`;
                  saveClothingItem({ ...item, imageUri: newImageUri });
                  return { ...item, status: "success", processedImageUri: newImageUri };
                } else {
                  return {
                    ...item,
                    status: "error",
                    errorMessage: processedResult.error,
                  };
                }
              }
              return item;
            })
          );
        }

        // Update credits
        if (result.creditsRemaining !== undefined) {
          setCredits(result.creditsRemaining);
        }
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const successCount = items.filter((i) => i.status === "success").length;
      Alert.alert(
        "Processing Complete",
        `Successfully processed ${successCount} items.`
      );
    } catch (error) {
      console.error("Bulk processing error:", error);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", "Failed to process images. Please try again.");
      
      // Mark failed items
      setItems((prev) =>
        prev.map((item) =>
          item.status === "processing" ? { ...item, status: "error" } : item
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }: { item: ProcessableItem }) => (
    <TouchableOpacity
      onPress={() => !processing && toggleSelect(item.id)}
      disabled={processing}
      style={[
        styles.itemCard,
        {
          backgroundColor: colors.surface,
          borderColor: item.selected ? colors.primary : colors.border,
          borderWidth: item.selected ? 2 : 1,
          opacity: processing && !item.selected ? 0.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.processedImageUri || item.imageUri }}
        style={styles.itemImage}
        contentFit="cover"
      />
      
      {/* Selection checkbox */}
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: item.selected ? colors.primary : colors.background,
            borderColor: item.selected ? colors.primary : colors.border,
          },
        ]}
      >
        {item.selected && (
          <MaterialIcons name="check" size={16} color="#fff" />
        )}
      </View>

      {/* Status indicator */}
      {item.status === "processing" && (
        <View style={[styles.statusOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.statusText}>Processing...</Text>
        </View>
      )}
      {item.status === "success" && (
        <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
          <MaterialIcons name="check" size={12} color="#fff" />
        </View>
      )}
      {item.status === "error" && (
        <View style={[styles.statusBadge, { backgroundColor: colors.error }]}>
          <MaterialIcons name="close" size={12} color="#fff" />
        </View>
      )}

      <Text
        style={[styles.itemName, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {item.name || item.brand || "Item"}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Bulk Background Removal
          </Text>
          {credits !== null && (
            <Text style={[styles.credits, { color: colors.muted }]}>
              {credits} credits remaining
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {items.every((i) => i.selected) ? "Deselect All" : "Select All"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items Grid */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="check-circle" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            All Done!
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            All your items have clean backgrounds.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}

      {/* Process Button */}
      {items.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={processSelected}
            disabled={processing || selectedCount === 0}
            style={[
              styles.processButton,
              {
                backgroundColor:
                  processing || selectedCount === 0
                    ? colors.muted
                    : colors.foreground,
              },
            ]}
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <MaterialIcons
                  name="auto-fix-high"
                  size={20}
                  color={colors.background}
                />
                <Text style={[styles.processButtonText, { color: colors.background }]}>
                  {selectedCount > 0
                    ? `Remove Backgrounds (${selectedCount})`
                    : "Select Items"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  credits: {
    fontSize: 12,
    marginTop: 2,
  },
  selectAllButton: {
    padding: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    padding: 12,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  itemCard: {
    flex: 1,
    maxWidth: "32%",
    borderRadius: 12,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    aspectRatio: 1,
  },
  checkbox: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: {
    fontSize: 12,
    padding: 8,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  processButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
