import { useEffect, useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  ClothingItem,
  getClothingItems,
  deleteClothingItem,
  calculateCostPerWear,
} from "@/lib/storage";

const { width, height } = Dimensions.get("window");

const CATEGORY_LABELS: Record<string, string> = {
  tops: "Top",
  bottoms: "Bottom",
  shoes: "Shoes",
  accessories: "Accessory",
  outerwear: "Outerwear",
};

export default function ItemDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ClothingItem | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      const items = await getClothingItems();
      const found = items.find((i) => i.id === id);
      setItem(found || null);
    };
    loadItem();
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this item from your closet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (id) {
              await deleteClothingItem(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (!item) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const costPerWear = calculateCostPerWear(item);
  const originalPrice = item.purchasePrice * 1.5; // Simulated original price

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Product Details</Text>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons name="delete-outline" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: item.imageUri }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
          {/* Image pagination dots */}
          <View style={styles.pagination}>
            <View style={[styles.dot, styles.dotActive, { backgroundColor: colors.foreground }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
          </View>
        </View>

        {/* Size selector (decorative) */}
        <View style={styles.sizeSection}>
          {["S", "M", "L", "XL"].map((size, index) => (
            <Pressable
              key={size}
              style={[
                styles.sizeButton,
                {
                  backgroundColor: index === 2 ? colors.primary : colors.surface,
                  borderColor: index === 2 ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.sizeText,
                  { color: index === 2 ? colors.background : colors.foreground },
                ]}
              >
                {size}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text style={[styles.brandName, { color: colors.foreground }]}>
                {item.brand || "Unknown Brand"}
              </Text>
              <Text style={[styles.itemDescription, { color: colors.muted }]}>
                {item.color} {CATEGORY_LABELS[item.category] || item.category}
              </Text>
            </View>
            <View style={styles.priceColumn}>
              <Text style={[styles.currentPrice, { color: colors.foreground }]}>
                ${item.purchasePrice.toFixed(2)}
              </Text>
              <Text style={[styles.originalPrice, { color: colors.muted }]}>
                ${originalPrice.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tagPill, { backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Expandable Sections */}
        <View style={styles.sectionsContainer}>
          <Pressable style={[styles.expandableSection, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Product details
            </Text>
            <MaterialIcons name="expand-more" size={20} color={colors.muted} />
          </Pressable>

          <Pressable style={[styles.expandableSection, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Wear Statistics
            </Text>
            <MaterialIcons name="expand-more" size={20} color={colors.muted} />
          </Pressable>

          <Pressable style={[styles.expandableSection, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Resale Value
            </Text>
            <MaterialIcons name="expand-more" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {item.wearCount}x
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Times Worn</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              ${costPerWear.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Cost Per Wear</Text>
          </View>
        </View>

        {/* Watermark */}
        <View style={styles.watermarkContainer}>
          <Text style={[styles.watermark, { color: colors.border }]}>BLACK</Text>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.background }]}>
            Add To Outfit
          </Text>
        </Pressable>
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
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  imageSection: {
    position: "relative",
    marginHorizontal: 16,
  },
  heroImage: {
    width: "100%",
    height: height * 0.45,
    borderRadius: 24,
  },
  pagination: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -20 }],
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    height: 24,
  },
  sizeSection: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    marginTop: -30,
  },
  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContent: {
    flex: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  itemDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  priceColumn: {
    alignItems: "flex-end",
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: "700",
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  expandableSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  watermarkContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  watermark: {
    fontSize: 60,
    fontWeight: "900",
    letterSpacing: 15,
    opacity: 0.1,
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
