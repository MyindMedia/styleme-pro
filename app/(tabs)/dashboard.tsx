import { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClothingItem,
  ClothingCategory,
  getClothingItems,
  getOutfits,
  Outfit,
} from "@/lib/storage";

const ONBOARDING_KEY = "@fitcheck_onboarding_complete";

interface CategoryStats {
  category: ClothingCategory;
  count: number;
  value: number;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [_outfits, setOutfits] = useState<Outfit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [clothingData, outfitData] = await Promise.all([
      getClothingItems(),
      getOutfits(),
    ]);
    setItems(clothingData);
    setOutfits(outfitData);
  }, []);

  // Check if onboarding is complete
  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading) return;
      try {
        if (profile?.preferences?.onboarding_completed) return;
        const localOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (localOnboarding) return;
        router.replace("/onboarding");
      } catch (error) {
        console.error("Error checking onboarding:", error);
      }
    };
    checkOnboarding();
  }, [profile, authLoading, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initial sync on mount
  useEffect(() => {
    if (user && user.id && profile?.id) {
        // Run in background so it doesn't block UI, then reload data
        performFullSync({ id: Number(profile.id), openId: user.id })
          .then(() => loadData())
          .catch(err => console.error("Initial sync failed:", err));
    }
  }, [user, profile, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user && user.id && profile?.id) {
       try {
         await performFullSync({ id: Number(profile.id), openId: user.id });
       } catch (e) {
         console.error("Refresh sync failed:", e);
       }
    }
    await loadData();
    setRefreshing(false);
  }, [loadData, user, profile]);

  // Calculate stats
  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  const totalWears = items.reduce((sum, item) => sum + (item.wearCount || 0), 0);
  const avgCostPerWear = totalWears > 0 ? totalValue / totalWears : 0;

  // Category breakdown
  const categoryStats: CategoryStats[] = [
    {
      category: "tops",
      count: items.filter((i) => i.category === "tops").length,
      value: items.filter((i) => i.category === "tops").reduce((s, i) => s + (i.purchasePrice || 0), 0),
      icon: "dry-cleaning",
    },
    {
      category: "bottoms",
      count: items.filter((i) => i.category === "bottoms").length,
      value: items.filter((i) => i.category === "bottoms").reduce((s, i) => s + (i.purchasePrice || 0), 0),
      icon: "straighten",
    },
    {
      category: "shoes",
      count: items.filter((i) => i.category === "shoes").length,
      value: items.filter((i) => i.category === "shoes").reduce((s, i) => s + (i.purchasePrice || 0), 0),
      icon: "directions-walk",
    },
    {
      category: "accessories",
      count: items.filter((i) => i.category === "accessories").length,
      value: items.filter((i) => i.category === "accessories").reduce((s, i) => s + (i.purchasePrice || 0), 0),
      icon: "watch",
    },
    {
      category: "outerwear",
      count: items.filter((i) => i.category === "outerwear").length,
      value: items.filter((i) => i.category === "outerwear").reduce((s, i) => s + (i.purchasePrice || 0), 0),
      icon: "ac-unit",
    },
  ];

  // Most worn items
  const mostWornItems = [...items]
    .filter((i) => i.wearCount > 0)
    .sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))
    .slice(0, 5);

  // Recently added
  const recentItems = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // Items never worn
  const unwornItems = items.filter((i) => !i.wearCount || i.wearCount === 0);

  const handleAddItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-item");
  };

  const cardWidth = (screenWidth - 48 - 12) / 2;

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {profile?.full_name || user?.email?.split("@")[0] || "Fashionista"}
            </Text>
          </View>
          <Pressable
            onPress={handleAddItem}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={24} color={colors.background} />
          </Pressable>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="checkroom" size={28} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {totalItems}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Total Items
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="attach-money" size={28} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              ${totalValue.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Wardrobe Value
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="repeat" size={28} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {totalWears}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Total Wears
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="trending-down" size={28} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              ${avgCostPerWear.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Avg Cost/Wear
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActions}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/shuffle" as any);
              }}
              style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + "20" }]}>
                <MaterialIcons name="shuffle" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
                Shuffle Outfit
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/add-item");
              }}
              style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#10B981" + "20" }]}>
                <MaterialIcons name="add-a-photo" size={24} color="#10B981" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
                Add Item
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/wishlist" as any);
              }}
              style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#EC4899" + "20" }]}>
                <MaterialIcons name="favorite" size={24} color="#EC4899" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
                Wishlist
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/tracker");
              }}
              style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#8B5CF6" + "20" }]}>
                <MaterialIcons name="calendar-today" size={24} color="#8B5CF6" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
                Log Outfit
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Category Breakdown
            </Text>
            <Pressable onPress={() => router.push("/")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>View All</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categoryStats.map((cat) => (
              <Pressable
                key={cat.category}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/");
                }}
                style={[styles.categoryCard, { backgroundColor: colors.surface }]}
              >
                <MaterialIcons name={cat.icon} size={24} color={colors.primary} />
                <Text style={[styles.categoryName, { color: colors.foreground }]}>
                  {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                </Text>
                <Text style={[styles.categoryCount, { color: colors.muted }]}>
                  {cat.count} items
                </Text>
                <Text style={[styles.categoryValue, { color: colors.foreground }]}>
                  ${cat.value.toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recently Added */}
        {recentItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Recently Added
              </Text>
              <Pressable onPress={() => router.push("/")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>View All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemsScroll}
            >
              {recentItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/item/[id]", params: { id: item.id } });
                  }}
                  style={[styles.itemCard, { backgroundColor: colors.surface, width: cardWidth }]}
                >
                  <Image
                    source={{ uri: item.imageUri }}
                    style={[styles.itemImage, { width: cardWidth - 16, height: cardWidth }]}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemBrand, { color: colors.foreground }]} numberOfLines={1}>
                      {item.brand || "Unknown"}
                    </Text>
                    <Text style={[styles.itemType, { color: colors.muted }]} numberOfLines={1}>
                      {item.type}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Most Worn */}
        {mostWornItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Most Worn
              </Text>
            </View>
            <View style={styles.mostWornList}>
              {mostWornItems.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/item/[id]", params: { id: item.id } });
                  }}
                  style={[styles.mostWornItem, { backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.rankNumber, { color: colors.primary }]}>
                    #{index + 1}
                  </Text>
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.mostWornImage}
                    contentFit="cover"
                  />
                  <View style={styles.mostWornInfo}>
                    <Text style={[styles.mostWornBrand, { color: colors.foreground }]} numberOfLines={1}>
                      {item.brand || "Unknown"}
                    </Text>
                    <Text style={[styles.mostWornType, { color: colors.muted }]} numberOfLines={1}>
                      {item.type}
                    </Text>
                  </View>
                  <View style={styles.wearBadge}>
                    <MaterialIcons name="repeat" size={14} color={colors.primary} />
                    <Text style={[styles.wearCount, { color: colors.foreground }]}>
                      {item.wearCount}x
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Insights */}
        {unwornItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.insightCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.insightIcon, { backgroundColor: "#F59E0B" + "20" }]}>
                <MaterialIcons name="lightbulb" size={24} color="#F59E0B" />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: colors.foreground }]}>
                  Closet Insight
                </Text>
                <Text style={[styles.insightText, { color: colors.muted }]}>
                  {"You have "}{unwornItems.length}{" items you haven't worn yet. Try mixing them into your outfits!"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Empty State */}
        {totalItems === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="checkroom" size={48} color={colors.muted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Your Closet Awaits
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Start building your digital wardrobe to see stats and insights
            </Text>
            <Pressable
              onPress={handleAddItem}
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="add" size={20} color={colors.background} />
              <Text style={[styles.emptyButtonText, { color: colors.background }]}>
                Add Your First Item
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  categoryScroll: {
    gap: 12,
  },
  categoryCard: {
    width: 120,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  categoryCount: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  itemsScroll: {
    gap: 12,
  },
  itemCard: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 8,
  },
  itemImage: {
    borderRadius: 12,
  },
  itemInfo: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  itemBrand: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemType: {
    fontSize: 12,
    marginTop: 2,
  },
  mostWornList: {
    gap: 8,
  },
  mostWornItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "700",
    width: 28,
  },
  mostWornImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  mostWornInfo: {
    flex: 1,
  },
  mostWornBrand: {
    fontSize: 14,
    fontWeight: "600",
  },
  mostWornType: {
    fontSize: 12,
    marginTop: 2,
  },
  wearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  wearCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  insightCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
