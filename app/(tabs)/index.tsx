import { useCallback, useEffect, useState } from "react";
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

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  ClothingItem,
  ClothingCategory,
  getClothingItems,
} from "@/lib/storage";

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
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    const data = await getClothingItems();
    setItems(data);
  }, []);

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
      {/* User Greeting */}
      <View style={styles.greetingRow}>
        <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="person" size={20} color={colors.muted} />
        </View>
        <View style={styles.greetingText}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>Hi there!</Text>
          <Text style={[styles.subGreeting, { color: colors.muted }]}>Welcome back</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="search" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable 
            onPress={handleAddItem}
            style={[styles.iconButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
          </Pressable>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/shuffle" as any);
          }}
          style={({ pressed }) => [
            styles.quickActionCard,
            { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <MaterialIcons name="shuffle" size={22} color={colors.primary} />
          <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Shuffle</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/wishlist" as any);
          }}
          style={({ pressed }) => [
            styles.quickActionCard,
            { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <MaterialIcons name="favorite" size={22} color="#ED64A6" />
          <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Wishlist</Text>
        </Pressable>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Closet</Text>
        <Text style={[styles.seeAll, { color: colors.muted }]}>
          {items.length} items
        </Text>
      </View>

      {/* Category Pills */}
      <FlatList
        data={CATEGORIES}
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
                setSelectedCategory(item.key);
              }}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? colors.background : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
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
        {/* Add to cart style button */}
        <Pressable style={[styles.quickAction, { backgroundColor: colors.background }]}>
          <MaterialIcons name="favorite-border" size={16} color={colors.foreground} />
        </Pressable>
      </View>
      
      <View style={styles.itemInfo}>
        <Text style={[styles.itemBrand, { color: colors.foreground }]} numberOfLines={1}>
          {item.brand || "Unknown Brand"}
        </Text>
        <Text style={[styles.itemCategory, { color: colors.muted }]} numberOfLines={1}>
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.itemPrice, { color: colors.foreground }]}>
            ${item.purchasePrice.toFixed(2)}
          </Text>
          {item.wearCount > 0 && (
            <Text style={[styles.wearCount, { color: colors.muted }]}>
              {item.wearCount}x worn
            </Text>
          )}
        </View>
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
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingText: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "System",
  },
  subGreeting: {
    fontSize: 13,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 14,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  itemCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: CARD_WIDTH * 1.2,
    borderRadius: 16,
  },
  quickAction: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    padding: 12,
  },
  itemBrand: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemCategory: {
    fontSize: 13,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  wearCount: {
    fontSize: 12,
  },
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
