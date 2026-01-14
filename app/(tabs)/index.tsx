import { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Dimensions,
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
  cleanupBrokenImages,
} from "@/lib/storage";

const ONBOARDING_KEY = "@fitcheck_onboarding_complete";

const CATEGORIES: { key: ClothingCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tops", label: "Tops" },
  { key: "bottoms", label: "Bottoms" },
  { key: "shoes", label: "Shoes" },
  { key: "accessories", label: "Accessories" },
  { key: "outerwear", label: "Outerwear" },
];

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

export default function ClosetScreen() {
  const colors = useColors();
  const router = useRouter();
  const { profile, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    const data = await getClothingItems();
    setItems(data);
  }, []);

  // Check if onboarding is complete
  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading) return;

      try {
        // Check profile preferences first (syncs across devices)
        if (profile?.preferences?.onboarding_completed) {
          return;
        }

        // Fallback to local storage (for guest/offline or legacy)
        const localOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (localOnboarding) {
          return;
        }

        // If neither is true, redirect to onboarding
        router.replace("/onboarding");
      } catch (error) {
        console.error("Error checking onboarding:", error);
      }
    };
    checkOnboarding();
  }, [profile, authLoading, router]);

  // Perform background cleanup of broken images when authenticated
  useEffect(() => {
    if (profile?.id) {
      const runCleanup = async () => {
        const result = await cleanupBrokenImages();
        if (result.fixed > 0) {
          console.log(`[Closet] Fixed ${result.fixed} broken images`);
          loadItems(); // Reload if any were fixed
        }
      };
      runCleanup();
    }
  }, [profile?.id, loadItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  const filteredItems = selectedCategory === "all"
    ? items
    : items.filter((item) => item.category === selectedCategory);

  const handleAddItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-item");
  };

  const handleItemPress = (item: ClothingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/item/[id]",
      params: { id: item.id },
    });
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton}>
          <MaterialIcons name="menu" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>HOME</Text>
        <Pressable style={styles.iconButton} onPress={() => router.push("/profile")}>
          <MaterialIcons name="person-outline" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <MaterialIcons name="search" size={20} color={colors.muted} />
        <Text style={[styles.searchText, { color: colors.muted }]}>Search</Text>
      </View>

      {/* Featured Banner (Mocking "New Season" from design) */}
      <View style={[styles.bannerCard, { backgroundColor: "#E5E5E5" }]}>
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerTitle, { fontFamily: 'PlayfairDisplay_700Bold' }]}>NEW SEASON NOW</Text>
          <Text style={[styles.bannerSubtitle, { fontFamily: 'PlayfairDisplay_400Regular' }]}>50% OFF</Text>
          <Pressable style={styles.bannerButton}>
             <Text style={styles.bannerButtonText}>SHOP NOW</Text>
          </Pressable>
        </View>
        {/* Placeholder for image */}
        <View style={styles.bannerImagePlaceholder} />
      </View>

      {/* Categories */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>CATEGORIES</Text>
        <Text style={[styles.seeAll, { color: colors.muted }]}>SEE ALL</Text>
      </View>

      <FlatList
        data={CATEGORIES.filter(c => c.key !== 'all')} // Show specific categories
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item.key;
          return (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(item.key === selectedCategory ? 'all' : item.key);
              }}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: isSelected ? colors.primary : '#D4D4D4', // Grey from design
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryCardText,
                  { color: isSelected ? "#fff" : "#fff", fontFamily: 'PlayfairDisplay_600SemiBold' },
                ]}
              >
                {item.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Popular / My Closet */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>POPULAR</Text>
        <Text style={[styles.seeAll, { color: colors.muted }]}>SEE ALL</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <Pressable
      onPress={() => handleItemPress(item)}
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: colors.surface,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUri }}
          style={styles.itemImage}
          contentFit="cover"
          transition={200}
        />
        {/* Heart Icon */}
        <Pressable style={styles.heartIcon}>
          <MaterialIcons name="favorite-border" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemBrand, { color: colors.foreground, fontFamily: 'PlayfairDisplay_600SemiBold' }]} numberOfLines={1}>
          {item.brand || "Brand"}
        </Text>
        <Text style={[styles.itemCategory, { color: colors.muted }]} numberOfLines={1}>
          {item.category.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <MaterialIcons name="checkroom" size={48} color={colors.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Your Closet is Empty
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Start building your digital wardrobe by adding your first item
      </Text>
      <Pressable
        onPress={handleAddItem}
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
      >
        <MaterialIcons name="add" size={18} color={colors.background} />
        <Text style={[styles.emptyButtonText, { color: colors.background }]}>
          Add First Item
        </Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={filteredItems.length > 0 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Floating Add Button */}
      {items.length > 0 && (
        <Pressable
          onPress={handleAddItem}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <MaterialIcons name="add" size={26} color={colors.background} />
        </Pressable>
      )}

      {/* Watermark */}
      <View style={styles.watermark} pointerEvents="none">
        <Text style={[styles.watermarkText, { color: colors.border }]}>STYLE</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    letterSpacing: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginHorizontal: 16,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  searchText: {
    fontSize: 14,
  },
  bannerCard: {
    marginHorizontal: 16,
    height: 200,
    borderRadius: 0, // Sharp
    marginBottom: 32,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  bannerTitle: {
    fontSize: 24,
    marginBottom: 8,
    color: '#000',
    width: '80%',
  },
  bannerSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    color: '#666',
  },
  bannerButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    borderRadius: 0,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  bannerImagePlaceholder: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 150,
    height: 200,
    backgroundColor: '#D4D4D4',
    transform: [{ rotate: '15deg' }],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: 1,
  },
  seeAll: {
    fontSize: 12,
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 32,
  },
  categoryCard: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0, // Sharp
  },
  categoryCardText: {
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
  itemCard: {
    width: CARD_WIDTH,
    marginBottom: 8,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 12,
  },
  itemImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3, // Taller images
    borderRadius: 0, // Sharp
  },
  heartIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  itemInfo: {
    paddingHorizontal: 4,
  },
  itemBrand: {
    fontSize: 14,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    letterSpacing: 1,
  },
  // Keep empty state and fab
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
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
    textAlign: "center",
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
  fab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  watermark: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: -1,
  },
  watermarkText: {
    fontSize: 80,
    fontWeight: "900",
    letterSpacing: 20,
    opacity: 0.15,
  },
});
