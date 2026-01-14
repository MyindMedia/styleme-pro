import { useEffect, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getClosetStats, ClothingCategory } from "@/lib/storage";

const { width } = Dimensions.get("window");

const CATEGORY_COLORS: Record<string, string> = {
  tops: "#4CAF50",
  bottoms: "#2196F3",
  shoes: "#FF9800",
  accessories: "#9C27B0",
  outerwear: "#F44336",
  dresses: "#E91E63",
  swimwear: "#00BCD4",
};

export default function AnalyticsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getClosetStats();
    setStats(data);
  };

  if (!stats) return null;

  const renderStatCard = (title: string, value: string | number, sub: string, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
      </View>
      <View>
        <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.muted }]}>{title}</Text>
        <Text style={[styles.statSub, { color: color }]}>{sub}</Text>
      </View>
    </View>
  );

  const topColors = Object.entries(stats.colorDistribution || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  const topBrands = Object.entries(stats.brandDistribution || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3);

  return (
    <ScreenContainer edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Wardrobe Insights</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Summary Stats */}
        <View style={styles.summaryGrid}>
          {renderStatCard(
            "Worn Rate",
            `${Math.round(stats.wearRatio * 100)}%`,
            "Active Wardrobe",
            "auto-graph",
            colors.primary
          )}
          {renderStatCard(
            "Value/Item",
            `$${Math.round(stats.totalValue / (stats.totalItems || 1))}`,
            "Avg. Investment",
            "payments",
            colors.success
          )}
        </View>

        {/* Category Breakdown Chart */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Composition</Text>
          <View style={styles.chartWrapper}>
            <View style={styles.progressBar}>
              {Object.entries(stats.categoryBreakdown).map(([cat, count]: [any, any]) => (
                <View
                  key={cat}
                  style={{
                    flex: count as number,
                    height: "100%",
                    backgroundColor: CATEGORY_COLORS[cat] || colors.border,
                    marginHorizontal: 1
                  }}
                />
              ))}
            </View>
            <View style={styles.legendGrid}>
              {Object.entries(stats.categoryBreakdown).map(([cat, count]: [any, any]) => (
                <View key={cat} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[cat] || colors.border }]} />
                  <Text style={[styles.legendText, { color: colors.foreground }]}>
                    {cat} ({Math.round((count / stats.totalItems) * 100)}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Color Palette */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Color Palette</Text>
          <View style={styles.colorPalette}>
            {topColors.map(([color, count]: [any, any]) => (
              <View key={color} style={styles.colorItem}>
                <View style={[styles.colorChip, { backgroundColor: color.toLowerCase() === "white" ? "#F5F5F5" : color.toLowerCase() }]} />
                <Text style={[styles.colorName, { color: colors.foreground }]}>{color}</Text>
                <Text style={[styles.colorCount, { color: colors.muted }]}>{count} items</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Efficiency Insights */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionHeader, { color: colors.foreground }]}>Style Efficiency</Text>

          <View style={styles.insightRow}>
            <MaterialIcons name="star-outline" size={20} color={colors.primary} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: colors.foreground }]}>Most Used Item</Text>
              <Text style={[styles.insightValue, { color: colors.muted }]}>
                {stats.mostWornItem ? `${stats.mostWornItem.brand} ${stats.mostWornItem.type}` : "None yet"}
              </Text>
            </View>
          </View>

          <View style={styles.insightRow}>
            <MaterialIcons name="inventory-2" size={20} color={colors.warning || "#FF9800"} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: colors.foreground }]}>Untouched Items</Text>
              <Text style={[styles.insightValue, { color: colors.muted }]}>
                {stats.unwornItems.length} items haven't been worn in 90 days.
              </Text>
            </View>
          </View>

          <View style={styles.insightRow}>
            <MaterialIcons name="business" size={20} color={colors.primary} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: colors.foreground }]}>Top Brands</Text>
              <Text style={[styles.insightValue, { color: colors.muted }]}>
                {topBrands.map(b => b[0]).join(", ") || "No brand data"}
              </Text>
            </View>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  section: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  chartWrapper: {
    gap: 16,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: "row",
    overflow: "hidden",
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    opacity: 0.8,
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorItem: {
    alignItems: "center",
    width: (width - 72) / 3,
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  colorName: {
    fontSize: 13,
    fontWeight: "600",
  },
  colorCount: {
    fontSize: 11,
    marginTop: 2,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  insightValue: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
