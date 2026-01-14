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
  GarmentMeasurements,
  getClothingItems,
  deleteClothingItem,
  calculateCostPerWear,
} from "@/lib/storage";

const { width: _width, height } = Dimensions.get("window");

const CATEGORY_LABELS: Record<string, string> = {
  tops: "Top",
  bottoms: "Bottom",
  shoes: "Shoes",
  accessories: "Accessory",
  outerwear: "Outerwear",
  dresses: "Dress",
  swimwear: "Swimwear",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New with tags",
  "like-new": "Like new",
  good: "Good condition",
  fair: "Fair condition",
  worn: "Well worn",
};

const FIT_LABELS: Record<string, string> = {
  slim: "Slim fit",
  regular: "Regular fit",
  relaxed: "Relaxed fit",
  oversized: "Oversized",
};

const STRETCH_LABELS: Record<string, string> = {
  none: "No stretch",
  slight: "Slight stretch",
  moderate: "Moderate stretch",
  high: "High stretch",
};

// Measurement labels by category
const MEASUREMENT_CONFIG: Record<string, { key: keyof GarmentMeasurements; label: string; unit: string }[]> = {
  tops: [
    { key: "chest", label: "Chest", unit: '"' },
    { key: "length", label: "Length", unit: '"' },
    { key: "shoulderWidth", label: "Shoulder", unit: '"' },
    { key: "sleeveLength", label: "Sleeve", unit: '"' },
    { key: "waist", label: "Waist", unit: '"' },
  ],
  bottoms: [
    { key: "waist", label: "Waist", unit: '"' },
    { key: "inseam", label: "Inseam", unit: '"' },
    { key: "rise", label: "Rise", unit: '"' },
    { key: "thigh", label: "Thigh", unit: '"' },
    { key: "legOpening", label: "Leg Opening", unit: '"' },
    { key: "hipWidth", label: "Hip", unit: '"' },
  ],
  dresses: [
    { key: "chest", label: "Bust", unit: '"' },
    { key: "waist", label: "Waist", unit: '"' },
    { key: "hipWidth", label: "Hip", unit: '"' },
    { key: "bustToHem", label: "Length", unit: '"' },
    { key: "shoulderWidth", label: "Shoulder", unit: '"' },
  ],
  outerwear: [
    { key: "chest", label: "Chest", unit: '"' },
    { key: "length", label: "Length", unit: '"' },
    { key: "shoulderWidth", label: "Shoulder", unit: '"' },
    { key: "sleeveLength", label: "Sleeve", unit: '"' },
  ],
  shoes: [
    { key: "usSize", label: "US Size", unit: "" },
    { key: "euSize", label: "EU Size", unit: "" },
  ],
  accessories: [],
  swimwear: [
    { key: "chest", label: "Bust", unit: '"' },
    { key: "waist", label: "Waist", unit: '"' },
    { key: "hipWidth", label: "Hip", unit: '"' },
  ],
};

export default function ItemDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: false,
    measurements: false,
    stats: false,
    resale: false,
  });

  const toggleSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
          {/* Product Details Section */}
          <View>
            <Pressable
              onPress={() => toggleSection("details")}
              style={[styles.expandableSection, { borderColor: colors.border }]}
            >
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Product Details
              </Text>
              <MaterialIcons
                name={expandedSections.details ? "expand-less" : "expand-more"}
                size={20}
                color={colors.muted}
              />
            </Pressable>
            {expandedSections.details && (
              <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                {item.fabric && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="layers" size={18} color={colors.muted} />
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Material</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.fabric}</Text>
                  </View>
                )}
                {item.condition && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="star" size={18} color={colors.muted} />
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Condition</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {CONDITION_LABELS[item.condition] || item.condition}
                    </Text>
                  </View>
                )}
                {item.size && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="straighten" size={18} color={colors.muted} />
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Size</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.size}</Text>
                  </View>
                )}
                {item.style && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="style" size={18} color={colors.muted} />
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Style</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {item.style.charAt(0).toUpperCase() + item.style.slice(1)}
                    </Text>
                  </View>
                )}
                {item.type && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="category" size={18} color={colors.muted} />
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Type</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {item.type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                )}
                {item.productUrl && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // Could open URL in browser
                    }}
                    style={styles.detailRow}
                  >
                    <MaterialIcons name="link" size={18} color={colors.primary} />
                    <Text style={[styles.detailLabel, { color: colors.primary }]}>View Original</Text>
                    <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
                  </Pressable>
                )}
                {!item.fabric && !item.condition && !item.size && !item.style && (
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    No additional details available
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Measurements Section */}
          <View>
            <Pressable
              onPress={() => toggleSection("measurements")}
              style={[styles.expandableSection, { borderColor: colors.border }]}
            >
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Measurements
              </Text>
              <MaterialIcons
                name={expandedSections.measurements ? "expand-less" : "expand-more"}
                size={20}
                color={colors.muted}
              />
            </Pressable>
            {expandedSections.measurements && (
              <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                {item.measurements ? (
                  <>
                    {/* Size Label & Fit */}
                    <View style={styles.measurementHeader}>
                      {item.measurements.sizeLabel && (
                        <View style={[styles.sizeBadge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.sizeBadgeText, { color: colors.background }]}>
                            {item.measurements.sizeLabel}
                          </Text>
                        </View>
                      )}
                      {item.measurements.fit && (
                        <Text style={[styles.fitText, { color: colors.muted }]}>
                          {FIT_LABELS[item.measurements.fit] || item.measurements.fit}
                        </Text>
                      )}
                      {item.measurements.stretchLevel && (
                        <Text style={[styles.stretchText, { color: colors.muted }]}>
                          {STRETCH_LABELS[item.measurements.stretchLevel]}
                        </Text>
                      )}
                    </View>

                    {/* Measurements Grid */}
                    <View style={styles.measurementsGrid}>
                      {(MEASUREMENT_CONFIG[item.category] || []).map(({ key, label, unit }) => {
                        const value = item.measurements?.[key];
                        if (value === undefined || value === null) return null;
                        return (
                          <View key={key} style={[styles.measurementItem, { borderColor: colors.border }]}>
                            <Text style={[styles.measurementLabel, { color: colors.muted }]}>{label}</Text>
                            <Text style={[styles.measurementValue, { color: colors.foreground }]}>
                              {value}{unit}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* No measurements found */}
                    {(MEASUREMENT_CONFIG[item.category] || []).every(
                      ({ key }) => item.measurements?.[key] === undefined
                    ) && (
                      <Text style={[styles.emptyText, { color: colors.muted }]}>
                        No measurements recorded
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    No measurements available. Add measurements when editing this item.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Wear Statistics Section */}
          <View>
            <Pressable
              onPress={() => toggleSection("stats")}
              style={[styles.expandableSection, { borderColor: colors.border }]}
            >
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Wear Statistics
              </Text>
              <MaterialIcons
                name={expandedSections.stats ? "expand-less" : "expand-more"}
                size={20}
                color={colors.muted}
              />
            </Pressable>
            {expandedSections.stats && (
              <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="repeat" size={18} color={colors.muted} />
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Times Worn</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.wearCount}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="attach-money" size={18} color={colors.muted} />
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Cost Per Wear</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>${costPerWear.toFixed(2)}</Text>
                </View>
                {item.lastWornAt && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="schedule" size={18} color={colors.muted} />
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Last Worn</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {new Date(item.lastWornAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <MaterialIcons name="event" size={18} color={colors.muted} />
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Added</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Resale Value Section */}
          <View>
            <Pressable
              onPress={() => toggleSection("resale")}
              style={[styles.expandableSection, { borderColor: colors.border }]}
            >
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Resale Value
              </Text>
              <MaterialIcons
                name={expandedSections.resale ? "expand-less" : "expand-more"}
                size={20}
                color={colors.muted}
              />
            </Pressable>
            {expandedSections.resale && (
              <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="shopping-bag" size={18} color={colors.muted} />
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Purchase Price</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>${item.purchasePrice.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="trending-down" size={18} color={colors.muted} />
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Current Value</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    ${(item.currentValue || item.purchasePrice * 0.6).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="percent" size={18} color={colors.muted} />
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Depreciation</Text>
                  <Text style={[styles.detailValue, { color: colors.warning }]}>
                    -{Math.round(((item.purchasePrice - (item.currentValue || item.purchasePrice * 0.6)) / item.purchasePrice) * 100)}%
                  </Text>
                </View>
              </View>
            )}
          </View>
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

      {/* Bottom Actions */}
      <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.actionButtonsRow}>
          <Pressable
            onPress={() => router.push({ pathname: "/try-on", params: { itemId: item.id } })}
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons name="person-outline" size={20} color={colors.foreground} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              Try On
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.foreground, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.actionButtonText, { color: colors.background }]}>
              Add To Outfit
            </Text>
          </Pressable>
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
  sectionContent: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  measurementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  sizeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sizeBadgeText: {
    fontSize: 16,
    fontWeight: "700",
  },
  fitText: {
    fontSize: 14,
  },
  stretchText: {
    fontSize: 14,
  },
  measurementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  measurementItem: {
    width: "46%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  measurementLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: "700",
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
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
