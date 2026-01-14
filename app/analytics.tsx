import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PieChart, BarChart } from "react-native-chart-kit";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/AuthContext";
import { getAnalyticsSummary, AnalyticsSummary } from "@/lib/analytics";
import { calculateCostPerWear } from "@/lib/storage";

const { width } = Dimensions.get("window");

export default function AnalyticsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isPro } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  const loadData = useCallback(async () => {
    try {
      const summary = await getAnalyticsSummary();
      setData(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!data) return null;

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.muted,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  // Prepare Pie Chart Data
  const categoryPieData = data.categoryBreakdown.labels.map((label, index) => ({
    name: label,
    population: data.categoryBreakdown.data[index],
    color: data.categoryBreakdown.colors[index],
    legendFontColor: colors.muted,
    legendFontSize: 12,
  }));

  const colorPieData = data.colorBreakdown.labels.map((label, index) => ({
    name: label,
    population: data.colorBreakdown.data[index],
    color: data.colorBreakdown.colors[index],
    legendFontColor: colors.muted,
    legendFontSize: 12,
  }));

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <MaterialIcons 
            name="arrow-back" 
            size={24} 
            color={colors.foreground} 
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
        />
        <Text style={[styles.title, { color: colors.foreground }]}>Closet Analytics</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
            <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.kpiLabel, { color: colors.muted }]}>Total Value</Text>
                <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                    ${data.totalValue.toLocaleString()}
                </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.kpiLabel, { color: colors.muted }]}>Items</Text>
                <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                    {data.totalItems}
                </Text>
            </View>
        </View>
        <View style={styles.kpiContainer}>
            <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.kpiLabel, { color: colors.muted }]}>Avg Cost/Wear</Text>
                <Text style={[styles.kpiValue, { color: colors.success }]}>
                    ${data.avgCostPerWear.toFixed(2)}
                </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.kpiLabel, { color: colors.muted }]}>Est. Monthly Spend</Text>
                <Text style={[styles.kpiValue, { color: colors.warning }]}>
                    ${data.monthlySpend.toFixed(0)}
                </Text>
            </View>
        </View>

        {/* Categories Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.foreground }]}>Categories</Text>
            <PieChart
                data={categoryPieData}
                width={width - 48}
                height={220}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
            />
        </View>

        {/* Colors Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.foreground }]}>Color Palette</Text>
            <PieChart
                data={colorPieData}
                width={width - 48}
                height={220}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
            />
        </View>

        {/* Most Worn Items */}
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Most Worn Items</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {data.mostWornItems.map((item) => (
                    <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
                        <Image source={{ uri: item.imageUri }} style={styles.itemImage} contentFit="cover" />
                        <View style={styles.itemInfo}>
                            <Text numberOfLines={1} style={[styles.itemName, { color: colors.foreground }]}>
                                {item.brand || item.type}
                            </Text>
                            <Text style={[styles.itemStat, { color: colors.primary }]}>
                                {item.wearCount} wears
                            </Text>
                            <Text style={[styles.itemSubStat, { color: colors.success }]}>
                                ${calculateCostPerWear(item).toFixed(2)} / wear
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>

        {/* Least Worn Items */}
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Needs Love (Least Worn)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {data.leastWornItems.map((item) => (
                    <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
                        <Image source={{ uri: item.imageUri }} style={styles.itemImage} contentFit="cover" />
                        <View style={styles.itemInfo}>
                            <Text numberOfLines={1} style={[styles.itemName, { color: colors.foreground }]}>
                                {item.brand || item.type}
                            </Text>
                            <Text style={[styles.itemStat, { color: colors.muted }]}>
                                {item.wearCount} wears
                            </Text>
                            <Text style={[styles.itemSubStat, { color: colors.warning }]}>
                                Last worn: {item.lastWornAt ? new Date(item.lastWornAt).toLocaleDateString() : "Never"}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  kpiContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 16,
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  itemCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    paddingBottom: 8,
  },
  itemImage: {
    width: "100%",
    height: 140,
  },
  itemInfo: {
    padding: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemStat: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  itemSubStat: {
    fontSize: 10,
    marginTop: 2,
  },
  lockOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
