import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  ClothingItem,
  Outfit,
  getClothingItems,
  saveOutfit,
  generateId,
} from "@/lib/storage";

const MOODS = [
  { key: "old-money", label: "Old Money", icon: "workspace-premium", color: "#D4AF37" },
  { key: "streetwear", label: "Streetwear", icon: "skateboarding", color: "#FF6B6B" },
  { key: "corporate", label: "Corporate", icon: "business-center", color: "#4A5568" },
  { key: "casual", label: "Casual", icon: "weekend", color: "#48BB78" },
  { key: "date-night", label: "Date Night", icon: "favorite", color: "#ED64A6" },
  { key: "athleisure", label: "Athleisure", icon: "fitness-center", color: "#4299E1" },
];

const { width } = Dimensions.get("window");

interface GeneratedOutfit {
  id: string;
  items: ClothingItem[];
  mood: string;
}

export default function StyleMeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState("old-money");
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [generatedOutfits, setGeneratedOutfits] = useState<GeneratedOutfit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      const items = await getClothingItems();
      setClosetItems(items);
    };
    loadItems();
  }, []);

  const generateOutfits = useCallback(async () => {
    if (closetItems.length < 2) {
      return;
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const tops = closetItems.filter((i) => i.category === "tops");
    const bottoms = closetItems.filter((i) => i.category === "bottoms");
    const shoes = closetItems.filter((i) => i.category === "shoes");
    const accessories = closetItems.filter((i) => i.category === "accessories");
    const outerwear = closetItems.filter((i) => i.category === "outerwear");

    const outfits: GeneratedOutfit[] = [];

    // Generate 3 outfit combinations
    for (let i = 0; i < 3; i++) {
      const outfitItems: ClothingItem[] = [];

      // Pick a random top
      if (tops.length > 0) {
        outfitItems.push(tops[Math.floor(Math.random() * tops.length)]);
      }

      // Pick a random bottom
      if (bottoms.length > 0) {
        outfitItems.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
      }

      // Pick random shoes
      if (shoes.length > 0) {
        outfitItems.push(shoes[Math.floor(Math.random() * shoes.length)]);
      }

      // Sometimes add accessories or outerwear
      if (accessories.length > 0 && Math.random() > 0.5) {
        outfitItems.push(accessories[Math.floor(Math.random() * accessories.length)]);
      }

      if (outerwear.length > 0 && Math.random() > 0.6) {
        outfitItems.push(outerwear[Math.floor(Math.random() * outerwear.length)]);
      }

      if (outfitItems.length >= 2) {
        outfits.push({
          id: generateId(),
          items: outfitItems,
          mood: selectedMood,
        });
      }
    }

    setGeneratedOutfits(outfits);
    setIsGenerating(false);
    setHasGenerated(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [closetItems, selectedMood]);

  const handleSaveOutfit = async (outfit: GeneratedOutfit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newOutfit: Outfit = {
      id: outfit.id,
      name: `${MOODS.find((m) => m.key === outfit.mood)?.label || "Custom"} Look`,
      itemIds: outfit.items.map((i) => i.id),
      mood: outfit.mood,
      occasions: [],
      createdAt: new Date().toISOString(),
      isFromAI: true,
    };

    await saveOutfit(newOutfit);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderMoodPill = ({ item }: { item: typeof MOODS[0] }) => {
    const isSelected = selectedMood === item.key;
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedMood(item.key);
          setHasGenerated(false);
        }}
        style={({ pressed }) => [
          styles.moodPill,
          {
            backgroundColor: isSelected ? item.color : colors.surface,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <MaterialIcons
          name={item.icon as any}
          size={18}
          color={isSelected ? "#fff" : colors.foreground}
        />
        <Text
          style={[
            styles.moodText,
            { color: isSelected ? "#fff" : colors.foreground },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  const renderOutfitCard = ({ item, index }: { item: GeneratedOutfit; index: number }) => {
    const moodInfo = MOODS.find((m) => m.key === item.mood);
    
    return (
      <View style={[styles.outfitCard, { backgroundColor: colors.surface }]}>
        <View style={styles.outfitHeader}>
          <View style={[styles.outfitBadge, { backgroundColor: moodInfo?.color || colors.primary }]}>
            <Text style={styles.outfitBadgeText}>Look {index + 1}</Text>
          </View>
          <Pressable
            onPress={() => handleSaveOutfit(item)}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialIcons name="bookmark-border" size={18} color={colors.background} />
            <Text style={[styles.saveButtonText, { color: colors.background }]}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.outfitGrid}>
          {item.items.map((clothingItem, idx) => (
            <View key={idx} style={styles.outfitItemContainer}>
              <Image
                source={{ uri: clothingItem.imageUri }}
                style={styles.outfitItemImage}
                contentFit="cover"
              />
              <Text
                style={[styles.outfitItemLabel, { color: colors.muted }]}
                numberOfLines={1}
              >
                {clothingItem.brand || clothingItem.category}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="auto-awesome" size={64} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {closetItems.length < 2
          ? "Add More Items"
          : "Ready to Style You"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        {closetItems.length < 2
          ? "Add at least 2 items to your closet to generate outfits"
          : "Select a mood and tap Generate to create AI-powered looks"}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Style Me</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          AI-powered outfit suggestions
        </Text>
      </View>

      <View style={styles.moodSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Choose Your Mood
        </Text>
        <FlatList
          data={MOODS}
          renderItem={renderMoodPill}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodList}
        />
      </View>

      <Pressable
        onPress={generateOutfits}
        disabled={isGenerating || closetItems.length < 2}
        style={({ pressed }) => [
          styles.generateButton,
          {
            backgroundColor: colors.primary,
            opacity: isGenerating || closetItems.length < 2 ? 0.5 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {isGenerating ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <MaterialIcons name="auto-awesome" size={20} color={colors.background} />
            <Text style={[styles.generateButtonText, { color: colors.background }]}>
              Generate Looks
            </Text>
          </>
        )}
      </Pressable>

      {hasGenerated && generatedOutfits.length > 0 ? (
        <FlatList
          data={generatedOutfits}
          renderItem={renderOutfitCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.outfitList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderEmptyState()}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  moodSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  moodList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  moodPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  moodText: {
    fontSize: 14,
    fontWeight: "600",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  outfitList: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  outfitCard: {
    borderRadius: 16,
    padding: 16,
  },
  outfitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  outfitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  outfitBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  outfitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  outfitItemContainer: {
    width: (width - 80) / 3,
    alignItems: "center",
  },
  outfitItemImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  outfitItemLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
