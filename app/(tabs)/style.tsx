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
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
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
import { trpc } from "@/lib/trpc";

const MOODS = [
  { key: "old-money", label: "Old Money", icon: "workspace-premium", color: "#D4AF37" },
  { key: "streetwear", label: "Streetwear", icon: "skateboarding", color: "#FF6B6B" },
  { key: "corporate", label: "Corporate", icon: "business-center", color: "#4A5568" },
  { key: "casual", label: "Casual", icon: "weekend", color: "#48BB78" },
  { key: "date-night", label: "Date Night", icon: "favorite", color: "#ED64A6" },
  { key: "athleisure", label: "Athleisure", icon: "fitness-center", color: "#4299E1" },
];

// Demo items for when closet is empty
const DEMO_ITEMS: ClothingItem[] = [
  {
    id: "demo-1",
    imageUri: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
    category: "tops",
    type: "t-shirt",
    color: "White",
    brand: "Uniqlo",
    purchasePrice: 29,
    tags: [],
    occasions: ["casual"],
    seasons: ["all-season"],
    createdAt: new Date().toISOString(),
    wearCount: 0,
  },
  {
    id: "demo-2",
    imageUri: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
    category: "bottoms",
    type: "jeans",
    color: "Blue",
    brand: "Levi's",
    purchasePrice: 89,
    tags: [],
    occasions: ["casual"],
    seasons: ["all-season"],
    createdAt: new Date().toISOString(),
    wearCount: 0,
  },
  {
    id: "demo-3",
    imageUri: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400",
    category: "shoes",
    type: "sneakers",
    color: "White",
    brand: "Nike",
    purchasePrice: 120,
    tags: [],
    occasions: ["casual", "athletic"],
    seasons: ["all-season"],
    createdAt: new Date().toISOString(),
    wearCount: 0,
  },
  {
    id: "demo-4",
    imageUri: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
    category: "outerwear",
    type: "jacket",
    color: "Black",
    brand: "Zara",
    purchasePrice: 149,
    tags: [],
    occasions: ["casual", "date-night"],
    seasons: ["fall", "winter"],
    createdAt: new Date().toISOString(),
    wearCount: 0,
  },
  {
    id: "demo-5",
    imageUri: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400",
    category: "accessories",
    type: "watch",
    color: "Silver",
    brand: "Seiko",
    purchasePrice: 250,
    tags: [],
    occasions: ["business", "casual"],
    seasons: ["all-season"],
    createdAt: new Date().toISOString(),
    wearCount: 0,
  },
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [weatherRecommendation, setWeatherRecommendation] = useState<any>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  const suggestOutfitsMutation = trpc.clothing.suggestOutfits.useMutation();
  const weatherRecommendationMutation = trpc.weather.getOutfitRecommendation.useMutation();

  useEffect(() => {
    const loadItems = async () => {
      const items = await getClothingItems();
      setClosetItems(items);
    };
    loadItems();
  }, []);

  const getItemsForGeneration = () => {
    return isDemoMode ? DEMO_ITEMS : closetItems;
  };

  const generateOutfits = useCallback(async () => {
    const items = getItemsForGeneration();

    if (items.length < 2) {
      return;
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await suggestOutfitsMutation.mutateAsync({
        itemDescription: `A complete outfit for a ${selectedMood} vibe`,
        closetItems: items.map(item => ({
          id: item.id,
          name: item.name || `${item.color} ${item.type}`,
          category: item.category,
          type: item.type,
          color: item.color,
          style: item.style,
        })),
        mood: selectedMood,
      });

      if (response.success && response.suggestions) {
        // The LLM response might be structured in different ways depending on the prompt
        // Assuming it returns { outfits: [{ itemIds: string[] }] } or similar
        const suggestions = response.suggestions as any;
        const rawOutfits = suggestions.outfits || suggestions.suggestions || [];

        const mappedOutfits: GeneratedOutfit[] = rawOutfits.map((raw: any) => {
          const outfitItems = (raw.itemIds || [])
            .map((id: string) => items.find((item) => item.id === id))
            .filter((item: ClothingItem | undefined): item is ClothingItem => !!item);

          return {
            id: generateId(),
            items: outfitItems,
            mood: selectedMood,
          };
        }).filter((o: GeneratedOutfit) => o.items.length >= 2);

        if (mappedOutfits.length > 0) {
          setGeneratedOutfits(mappedOutfits);
          setHasGenerated(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          throw new Error("No valid outfits generated");
        }
      } else {
        throw new Error(response.error || "Failed to generate outfits");
      }
    } catch (error) {
      console.error("AI Generation error:", error);
      Alert.alert("Generation Failed", "We couldn't generate outfits right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [closetItems, selectedMood, isDemoMode, suggestOutfitsMutation]);

  const handleSaveOutfit = async (outfit: GeneratedOutfit) => {
    if (isDemoMode) {
      Alert.alert(
        "Demo Mode",
        "Add items to your closet to save outfits! Tap 'Add Items' to get started.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Items", onPress: () => router.push("/add-item") },
        ]
      );
      return;
    }

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
    Alert.alert("Saved!", "Outfit saved to your collection.");
  };

  const handleTryDemo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDemoMode(true);
    setHasGenerated(false);
    setGeneratedOutfits([]);
  };

  const handleExitDemo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDemoMode(false);
    setHasGenerated(false);
    setGeneratedOutfits([]);
  };

  const generateWeatherLook = async () => {
    const items = isDemoMode ? DEMO_ITEMS : closetItems;
    if (items.length < 1) {
      Alert.alert("Need Items", "Add some items to your closet to get weather-based recommendations!");
      return;
    }

    setIsWeatherLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Get location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Permission to access location was denied. We need it for weather recommendations.");
        setIsWeatherLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // 2. Call tRPC
      const response = await weatherRecommendationMutation.mutateAsync({
        latitude,
        longitude,
        closetItems: items.map((item) => ({
          id: item.id,
          name: item.name || `${item.color} ${item.type}`,
          category: item.category,
          type: item.type,
          color: item.color,
          style: item.style,
          seasons: item.seasons,
          occasions: item.occasions,
        })),
        occasion: selectedMood,
      });

      if (response.success) {
        setWeatherRecommendation(response);

        // Map the suggested outfits to our local format if they provided specific items
        const rawOutfits = response.outfitSuggestions || [];
        const mappedOutfits: GeneratedOutfit[] = rawOutfits
          .map((raw: any) => {
            const outfitItems = (raw.itemIds || [])
              .map((id: string) => items.find((item) => item.id === id))
              .filter((item: ClothingItem | undefined): item is ClothingItem => !!item);

            return {
              id: Math.random().toString(36).substring(7),
              items: outfitItems,
              mood: selectedMood,
            };
          })
          .filter((o: GeneratedOutfit) => o.items.length >= 2);

        if (mappedOutfits.length > 0) {
          setGeneratedOutfits(mappedOutfits);
          setHasGenerated(true);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(response.error || "Failed to get weather recommendation");
      }
    } catch (error) {
      console.error("Weather Look error:", error);
      Alert.alert("Weather Look Failed", "We couldn't get weather data right now. Please try again.");
    } finally {
      setIsWeatherLoading(false);
    }
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
          <View style={styles.outfitHeaderLeft}>
            <View style={[styles.outfitBadge, { backgroundColor: moodInfo?.color || colors.primary }]}>
              <Text style={styles.outfitBadgeText}>Look {index + 1}</Text>
            </View>
            {isDemoMode && (
              <View style={[styles.demoBadge, { backgroundColor: colors.warning }]}>
                <Text style={styles.demoBadgeText}>Demo</Text>
              </View>
            )}
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

  const canGenerate = isDemoMode || closetItems.length >= 2;
  const itemCount = isDemoMode ? DEMO_ITEMS.length : closetItems.length;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="auto-awesome" size={64} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {closetItems.length < 2 ? "Add Items to Get Started" : "Ready to Style You"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        {closetItems.length < 2
          ? "Add at least 2 items to your closet, or try demo mode to see how it works!"
          : "Select a mood and tap Generate to create AI-powered looks"}
      </Text>

      {closetItems.length < 2 && (
        <View style={styles.emptyActions}>
          <Pressable
            onPress={() => router.push("/add-item")}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={[styles.primaryButtonText, { color: colors.background }]}>
              Add Items
            </Text>
          </Pressable>

          <Pressable
            onPress={handleTryDemo}
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <MaterialIcons name="play-arrow" size={20} color={colors.foreground} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              Try Demo Mode
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Style Me</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              AI-powered outfit suggestions
            </Text>
          </View>
          {isDemoMode && (
            <Pressable
              onPress={handleExitDemo}
              style={({ pressed }) => [
                styles.exitDemoButton,
                { backgroundColor: colors.warning, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.exitDemoText}>Exit Demo</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isDemoMode && (
        <View style={[styles.demoBanner, { backgroundColor: colors.warning + "20" }]}>
          <MaterialIcons name="info" size={18} color={colors.warning} />
          <Text style={[styles.demoBannerText, { color: colors.warning }]}>
            Demo Mode: Using sample items. Add your own clothes to save outfits!
          </Text>
        </View>
      )}

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
        disabled={isGenerating || !canGenerate}
        style={({ pressed }) => [
          styles.generateButton,
          {
            backgroundColor: colors.primary,
            opacity: isGenerating || !canGenerate ? 0.5 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {isGenerating ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <MaterialIcons name="auto-awesome" size={20} color={colors.background} />
            <Text style={[styles.generateButtonText, { color: colors.background }]}>
              Generate AI Looks {itemCount > 0 && `(${itemCount} items)`}
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={generateWeatherLook}
        disabled={isWeatherLoading || !canGenerate}
        style={({ pressed }) => [
          styles.weatherButton,
          {
            backgroundColor: colors.surface,
            opacity: isWeatherLoading || !canGenerate ? 0.5 : pressed ? 0.9 : 1,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        {isWeatherLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={[styles.weatherIcon, { backgroundColor: colors.primary + "10" }]}>
              <MaterialIcons name="wb-sunny" size={24} color={colors.primary} />
            </View>
            <View style={styles.weatherInfo}>
              <Text style={[styles.weatherTitle, { color: colors.foreground }]}>
                Weather Look
              </Text>
              <Text style={[styles.weatherSubtitle, { color: colors.muted }]}>
                Outfit based on your local weather
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
          </>
        )}
      </Pressable>

      {weatherRecommendation && weatherRecommendation.weather && (
        <View style={styles.weatherSummary}>
          <Text style={[styles.weatherSummaryText, { color: colors.foreground }]}>
            <Text style={{ fontWeight: "700" }}>
              {weatherRecommendation.weather.temperature}°F & {weatherRecommendation.weather.condition}.
            </Text>{" "}
            {weatherRecommendation.recommendation.summary}
          </Text>
        </View>
      )}

      {hasGenerated && generatedOutfits.length > 0 ? (
        <FlatList
          data={generatedOutfits}
          renderItem={renderOutfitCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.outfitList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  exitDemoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  exitDemoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  demoBannerText: {
    flex: 1,
    fontSize: 13,
  },
  weatherButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  weatherIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  weatherSubtitle: {
    fontSize: 13,
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
  weatherSummary: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  weatherSummaryText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
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
  outfitHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  demoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  demoBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#000",
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
    paddingTop: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  emptyActions: {
    marginTop: 20,
    gap: 12,
    width: "100%",
    maxWidth: 280,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
