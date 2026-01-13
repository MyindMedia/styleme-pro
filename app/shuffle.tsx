import { useCallback, useEffect, useState, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
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
  Outfit,
  getClothingItems,
  saveOutfit,
  generateId,
} from "@/lib/storage";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

// Categories to shuffle through for outfit building
const OUTFIT_CATEGORIES: ClothingCategory[] = ["tops", "bottoms", "shoes", "accessories", "outerwear"];

interface CategorySlot {
  category: ClothingCategory;
  label: string;
  items: ClothingItem[];
  currentIndex: number;
}

export default function ShuffleScreen() {
  const colors = useColors();
  const router = useRouter();
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [slots, setSlots] = useState<CategorySlot[]>([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Animation values for swipe
  const swipeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const items = await getClothingItems();
    setClosetItems(items);

    // Initialize slots with items grouped by category
    const categoryLabels: Record<ClothingCategory, string> = {
      tops: "Top",
      bottoms: "Bottom",
      shoes: "Shoes",
      accessories: "Accessory",
      outerwear: "Outerwear",
      dresses: "Dress",
      swimwear: "Swimwear",
    };

    const initialSlots: CategorySlot[] = OUTFIT_CATEGORIES
      .map((cat) => ({
        category: cat,
        label: categoryLabels[cat],
        items: items.filter((i) => i.category === cat),
        currentIndex: 0,
      }))
      .filter((slot) => slot.items.length > 0);

    // Randomize starting positions
    initialSlots.forEach((slot) => {
      slot.currentIndex = Math.floor(Math.random() * slot.items.length);
    });

    setSlots(initialSlots);
  };

  const shuffleSlot = useCallback((slotIndex: number, direction: "next" | "prev") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSlots((prev) => {
      const newSlots = [...prev];
      const slot = newSlots[slotIndex];
      
      if (direction === "next") {
        slot.currentIndex = (slot.currentIndex + 1) % slot.items.length;
      } else {
        slot.currentIndex = (slot.currentIndex - 1 + slot.items.length) % slot.items.length;
      }
      
      return newSlots;
    });

    // Animate swipe
    Animated.sequence([
      Animated.timing(swipeAnim, {
        toValue: direction === "next" ? -20 : 20,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(swipeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [swipeAnim]);

  const shuffleAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSlots((prev) => {
      return prev.map((slot) => ({
        ...slot,
        currentIndex: Math.floor(Math.random() * slot.items.length),
      }));
    });
  }, []);

  const saveCurrentOutfit = async () => {
    if (slots.length < 2) return;
    
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const selectedItems = slots.map((slot) => slot.items[slot.currentIndex]);
    
    const outfit: Outfit = {
      id: generateId(),
      name: `Shuffled Look ${new Date().toLocaleDateString()}`,
      itemIds: selectedItems.map((i) => i.id),
      mood: "casual",
      occasions: [],
      createdAt: new Date().toISOString(),
      isFromAI: false,
    };

    await saveOutfit(outfit);
    
    setIsSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          shuffleSlot(activeSlotIndex, "prev");
        } else if (gestureState.dx < -50) {
          shuffleSlot(activeSlotIndex, "next");
        }
      },
    })
  ).current;

  const renderSlotCard = (slot: CategorySlot, index: number) => {
    const currentItem = slot.items[slot.currentIndex];
    const isActive = index === activeSlotIndex;

    return (
      <View key={slot.category} style={styles.slotContainer}>
        <Text style={[styles.slotLabel, { color: colors.muted }]}>
          {slot.label}
        </Text>
        
        <View style={styles.cardRow}>
          {/* Previous button */}
          <Pressable
            onPress={() => shuffleSlot(index, "prev")}
            style={({ pressed }) => [
              styles.arrowButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <MaterialIcons name="chevron-left" size={32} color={colors.muted} />
          </Pressable>

          {/* Item card */}
          <Pressable
            onPress={() => setActiveSlotIndex(index)}
            {...(isActive ? panResponder.panHandlers : {})}
            style={[
              styles.itemCard,
              {
                backgroundColor: colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
                borderWidth: isActive ? 2 : 1,
              },
            ]}
          >
            {currentItem ? (
              <>
                <Image
                  source={{ uri: currentItem.imageUri }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
                <View style={styles.itemInfo}>
                  <Text
                    style={[styles.itemBrand, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {currentItem.brand || currentItem.type}
                  </Text>
                  <Text style={[styles.itemColor, { color: colors.muted }]}>
                    {currentItem.color}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <MaterialIcons name="add" size={32} color={colors.muted} />
              </View>
            )}
          </Pressable>

          {/* Next button */}
          <Pressable
            onPress={() => shuffleSlot(index, "next")}
            style={({ pressed }) => [
              styles.arrowButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <MaterialIcons name="chevron-right" size={32} color={colors.muted} />
          </Pressable>
        </View>

        {/* Item counter */}
        <Text style={[styles.counter, { color: colors.muted }]}>
          {slot.currentIndex + 1} / {slot.items.length}
        </Text>
      </View>
    );
  };

  if (slots.length === 0) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Shuffle</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyState}>
          <MaterialIcons name="shuffle" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Add Items First
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Add some clothes to your closet to start shuffling outfits
          </Text>
          <Pressable
            onPress={() => router.push("/add-item")}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={[styles.addButtonText, { color: colors.background }]}>
              Add Items
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Shuffle</Text>
        <Pressable onPress={shuffleAll}>
          <MaterialIcons name="shuffle" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Swipe or tap arrows to mix and match
      </Text>

      <View style={styles.slotsContainer}>
        {slots.map((slot, index) => renderSlotCard(slot, index))}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={shuffleAll}
          style={({ pressed }) => [
            styles.shuffleAllButton,
            { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <MaterialIcons name="shuffle" size={20} color={colors.foreground} />
          <Text style={[styles.shuffleAllText, { color: colors.foreground }]}>
            Shuffle All
          </Text>
        </Pressable>

        <Pressable
          onPress={saveCurrentOutfit}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="bookmark" size={20} color={colors.background} />
          <Text style={[styles.saveButtonText, { color: colors.background }]}>
            {isSaving ? "Saving..." : "Save Outfit"}
          </Text>
        </Pressable>
      </View>

      {/* Watermark */}
      <View style={styles.watermarkContainer}>
        <Text style={[styles.watermark, { color: colors.border }]}>SHUFFLE</Text>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  slotsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  slotContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowButton: {
    padding: 8,
  },
  itemCard: {
    width: width * 0.5,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemBrand: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemColor: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  emptyCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    fontSize: 11,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  shuffleAllButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  shuffleAllText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  watermarkContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: -1,
  },
  watermark: {
    fontSize: 80,
    fontWeight: "900",
    letterSpacing: 10,
    opacity: 0.05,
  },
});
