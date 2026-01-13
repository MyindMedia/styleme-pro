import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  ClothingItem,
  WearLog,
  getClothingItems,
  getWearLogs,
  calculateCostPerWear,
} from "@/lib/storage";

const { width } = Dimensions.get("window");

interface ItemAnalytics {
  item: ClothingItem;
  wearCount: number;
  costPerWear: number;
  lastWorn: string | null;
  daysSinceWorn: number;
  valueRating: "excellent" | "good" | "fair" | "poor";
}

type SortOption = "cpw" | "wears" | "value" | "recent";
type FilterOption = "all" | "excellent" | "good" | "fair" | "poor" | "unworn";

export default function AnalyticsScreen() {
  const colors = useColors();
  const router = useRouter();

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("cpw");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    const [itemsData, logsData] = await Promise.all([
      getClothingItems(),
      getWearLogs(),
    ]);
    setItems(itemsData);
    setWearLogs(logsData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const analytics = useMemo(() => {
    const today = new Date();
    
    return items.map((item): ItemAnalytics => {
      const itemLogs = wearLogs.filter(log => log.itemIds.includes(item.id));
      const wearCount = itemLogs.length;
      const cpw = calculateCostPerWear(item);
      
      const lastLog = itemLogs.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      const lastWorn = lastLog?.date || null;
      const daysSinceWorn = lastWorn 
        ? Math.floor((today.getTime() - new Date(lastWorn).getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      // Calculate value rating based on CPW relative to price
      let valueRating: ItemAnalytics["valueRating"] = "poor";
      if (wearCount === 0) {
        valueRating = "poor";
      } else if (cpw < 5) {
        valueRating = "excellent";
      } else if (cpw < 15) {
        valueRating = "good";
      } else if (cpw < 30) {
        valueRating = "fair";
      }

      return {
        item,
        wearCount,
        costPerWear: cpw,
        lastWorn,
        daysSinceWorn,
        valueRating,
      };
    });
  }, [items, wearLogs]);

  const filteredAndSorted = useMemo(() => {
    let result = [...analytics];

    // Filter
    if (filterBy === "unworn") {
      result = result.filter(a => a.wearCount === 0);
    } else if (filterBy !== "all") {
      result = result.filter(a => a.valueRating === filterBy);
    }

    // Sort
    switch (sortBy) {
      case "cpw":
        result.sort((a, b) => {
          if (a.wearCount === 0) return 1;
          if (b.wearCount === 0) return -1;
          return a.costPerWear - b.costPerWear;
        });
        break;
      case "wears":
        result.sort((a, b) => b.wearCount - a.wearCount);
        break;
      case "value":
        const valueOrder = { excellent: 0, good: 1, fair: 2, poor: 3 };
        result.sort((a, b) => valueOrder[a.valueRating] - valueOrder[b.valueRating]);
        break;
      case "recent":
        result.sort((a, b) => {
          if (!a.lastWorn) return 1;
          if (!b.lastWorn) return -1;
          return new Date(b.lastWorn).getTime() - new Date(a.lastWorn).getTime();
        });
        break;
    }

    return result;
  }, [analytics, sortBy, filterBy]);

  // Summary stats
  const stats = useMemo(() => {
    const withPrice = analytics.filter(a => a.item.purchasePrice && a.item.purchasePrice > 0);
    const totalSpent = withPrice.reduce((sum, a) => sum + (a.item.purchasePrice || 0), 0);
    const totalWears = analytics.reduce((sum, a) => sum + a.wearCount, 0);
    const avgCPW = totalWears > 0 ? totalSpent / totalWears : 0;
    const unwornCount = analytics.filter(a => a.wearCount === 0).length;
    const excellentCount = analytics.filter(a => a.valueRating === "excellent").length;

    return { totalSpent, totalWears, avgCPW, unwornCount, excellentCount };
  }, [analytics]);

  const getValueColor = (rating: ItemAnalytics["valueRating"]) => {
    switch (rating) {
      case "excellent": return colors.success;
      case "good": return colors.primary;
      case "fair": return colors.warning;
      case "poor": return colors.error;
    }
  };

  const getValueLabel = (rating: ItemAnalytics["valueRating"]) => {
    switch (rating) {
      case "excellent": return "Excellent Value";
      case "good": return "Good Value";
      case "fair": return "Fair Value";
      case "poor": return "Poor Value";
    }
  };

  const handleSort = (option: SortOption) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSortBy(option);
  };

  const handleFilter = (option: FilterOption) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFilterBy(option);
    setShowFilters(false);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Cost Per Wear
        </Text>
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          style={({ pressed }) => [styles.filterButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialIcons
            name="filter-list"
            size={24}
            color={filterBy !== "all" ? colors.primary : colors.foreground}
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="attach-money" size={24} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              ${stats.totalSpent.toFixed(0)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Spent</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="repeat" size={24} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {stats.totalWears}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Wears</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="trending-down" size={24} color={colors.success} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              ${stats.avgCPW.toFixed(2)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Avg CPW</Text>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsSection}>
          {stats.excellentCount > 0 && (
            <View style={[styles.insightCard, { backgroundColor: colors.success + "15" }]}>
              <MaterialIcons name="star" size={20} color={colors.success} />
              <Text style={[styles.insightText, { color: colors.foreground }]}>
                {stats.excellentCount} items are excellent value (under $5/wear)
              </Text>
            </View>
          )}
          {stats.unwornCount > 0 && (
            <View style={[styles.insightCard, { backgroundColor: colors.warning + "15" }]}>
              <MaterialIcons name="warning" size={20} color={colors.warning} />
              <Text style={[styles.insightText, { color: colors.foreground }]}>
                {stats.unwornCount} items haven't been worn yet
              </Text>
            </View>
          )}
        </View>

        {/* Filter Pills */}
        {showFilters && (
          <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>Filter by Value</Text>
            <View style={styles.filterPills}>
              {(["all", "excellent", "good", "fair", "poor", "unworn"] as FilterOption[]).map(option => (
                <Pressable
                  key={option}
                  onPress={() => handleFilter(option)}
                  style={[
                    styles.filterPill,
                    { backgroundColor: filterBy === option ? colors.primary : colors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: filterBy === option ? colors.background : colors.foreground },
                    ]}
                  >
                    {option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Sort Options */}
        <View style={styles.sortSection}>
          <Text style={[styles.sortLabel, { color: colors.muted }]}>Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sortOptions}>
              {([
                { key: "cpw", label: "Cost/Wear" },
                { key: "wears", label: "Most Worn" },
                { key: "value", label: "Value" },
                { key: "recent", label: "Recent" },
              ] as { key: SortOption; label: string }[]).map(option => (
                <Pressable
                  key={option.key}
                  onPress={() => handleSort(option.key)}
                  style={[
                    styles.sortButton,
                    {
                      backgroundColor: sortBy === option.key ? colors.foreground : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      { color: sortBy === option.key ? colors.background : colors.foreground },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Items List */}
        <View style={styles.itemsList}>
          {filteredAndSorted.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="analytics" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No items match your filter
              </Text>
            </View>
          ) : (
            filteredAndSorted.map((analytics, index) => (
              <View
                key={analytics.item.id}
                style={[styles.itemCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.itemRank}>
                  <Text style={[styles.rankNumber, { color: colors.muted }]}>
                    #{index + 1}
                  </Text>
                </View>
                <Image
                  source={{ uri: analytics.item.imageUri }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemBrand, { color: colors.foreground }]} numberOfLines={1}>
                    {analytics.item.brand || "Unknown"}
                  </Text>
                  <Text style={[styles.itemType, { color: colors.muted }]}>
                    {analytics.item.type}
                  </Text>
                  <View style={styles.itemStats}>
                    <View style={styles.itemStat}>
                      <MaterialIcons name="repeat" size={14} color={colors.muted} />
                      <Text style={[styles.itemStatText, { color: colors.muted }]}>
                        {analytics.wearCount} wears
                      </Text>
                    </View>
                    {analytics.item.purchasePrice && analytics.item.purchasePrice > 0 && (
                      <View style={styles.itemStat}>
                        <MaterialIcons name="attach-money" size={14} color={colors.muted} />
                        <Text style={[styles.itemStatText, { color: colors.muted }]}>
                          ${analytics.item.purchasePrice}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.itemValue}>
                  {analytics.wearCount > 0 && analytics.item.purchasePrice ? (
                    <>
                      <Text style={[styles.cpwValue, { color: getValueColor(analytics.valueRating) }]}>
                        ${analytics.costPerWear.toFixed(2)}
                      </Text>
                      <Text style={[styles.cpwLabel, { color: colors.muted }]}>per wear</Text>
                      <View
                        style={[
                          styles.valueBadge,
                          { backgroundColor: getValueColor(analytics.valueRating) + "20" },
                        ]}
                      >
                        <Text
                          style={[styles.valueBadgeText, { color: getValueColor(analytics.valueRating) }]}
                        >
                          {analytics.valueRating.charAt(0).toUpperCase() + analytics.valueRating.slice(1)}
                        </Text>
                      </View>
                    </>
                  ) : analytics.wearCount === 0 ? (
                    <View style={[styles.unwornBadge, { backgroundColor: colors.warning + "20" }]}>
                      <Text style={[styles.unwornText, { color: colors.warning }]}>Unworn</Text>
                    </View>
                  ) : (
                    <Text style={[styles.noPriceText, { color: colors.muted }]}>No price</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tips Section */}
        <View style={[styles.tipsSection, { backgroundColor: colors.surface }]}>
          <View style={styles.tipsHeader}>
            <MaterialIcons name="lightbulb" size={20} color={colors.warning} />
            <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Tips</Text>
          </View>
          <Text style={[styles.tipsText, { color: colors.muted }]}>
            • Aim for under $5 per wear for excellent value{"\n"}
            • Wear unworn items to improve their value{"\n"}
            • Consider selling items with high cost-per-wear
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  filterButton: {
    padding: 4,
  },
  summarySection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 11,
  },
  insightsSection: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
  },
  filterSection: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  filterPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  sortSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: "row",
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    overflow: "hidden",
  },
  itemRank: {
    width: 32,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: "600",
  },
  itemImage: {
    width: 70,
    height: 70,
  },
  itemInfo: {
    flex: 1,
    padding: 12,
  },
  itemBrand: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemType: {
    fontSize: 12,
    marginTop: 2,
  },
  itemStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  itemStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemStatText: {
    fontSize: 11,
  },
  itemValue: {
    alignItems: "flex-end",
    paddingRight: 12,
    minWidth: 80,
  },
  cpwValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  cpwLabel: {
    fontSize: 10,
  },
  valueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  valueBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  unwornBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unwornText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noPriceText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 16,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  tipsSection: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 22,
  },
});
