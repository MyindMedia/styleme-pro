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
import { useAuth } from "@/contexts/AuthContext";

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
  const { isPro, showPaywall } = useAuth();
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
    if (!isPro && !isDemoMode) {
      showPaywall();
      return;
    }

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
    if (!isPro && !isDemoMode) {
      showPaywall();
      return;
    }

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
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>STYLE ME</Text>
        <View style={styles.headerActions}>
           <MaterialIcons name="notifications-none" size={24} color={colors.foreground} />
           <MaterialIcons name="favorite-border" size={24} color={colors.foreground} />
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <MaterialIcons name="search" size={20} color={colors.muted} />
        <Text style={[styles.searchText, { color: colors.muted }]}>Search styles...</Text>
        <MaterialIcons name="tune" size={20} color={colors.muted} />
      </View>

      {isDemoMode && (
        <View style={[styles.demoBanner, { backgroundColor: "#F0F0F1" }]}>
          <Text style={[styles.demoBannerText, { color: colors.foreground, fontFamily: 'PlayfairDisplay_500Medium' }]}>
            DEMO MODE ACTIVE
          </Text>
          <Pressable onPress={handleExitDemo}>
             <Text style={{ textDecorationLine: 'underline', fontSize: 12 }}>EXIT</Text>
          </Pressable>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Moods / Categories */}
        <View style={styles.moodSection}>
          <FlatList
            data={MOODS}
            renderItem={renderMoodPill}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodList}
          />
        </View>

        {/* Generate Button (styled as a featured action) */}
        <Pressable
          onPress={generateOutfits}
          disabled={isGenerating || !canGenerate}
          style={({ pressed }) => [
            styles.generateButton,
            {
              backgroundColor: colors.primary,
              opacity: isGenerating || !canGenerate ? 0.8 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.generateButtonText, { color: "#fff", fontFamily: 'PlayfairDisplay_600SemiBold' }]}>
              GENERATE NEW LOOKS
            </Text>
          )}
        </Pressable>

        {/* Weather Look */}
        <Pressable
          onPress={generateWeatherLook}
          disabled={isWeatherLoading || !canGenerate}
          style={[styles.collectionCard, { backgroundColor: "#DADFFE" }]} // Subtle Blue from design
        >
           <View style={styles.collectionContent}>
              <Text style={[styles.collectionTitle, { fontFamily: 'PlayfairDisplay_700Bold' }]}>WEATHER EDIT</Text>
              <Text style={[styles.collectionSubtitle, { fontFamily: 'PlayfairDisplay_400Regular' }]}>
                {weatherRecommendation?.weather 
                  ? `${weatherRecommendation.weather.temperature}°F & ${weatherRecommendation.weather.condition}`
                  : "Curated for your forecast"}
              </Text>
              {isWeatherLoading && <ActivityIndicator color="#000" style={{ marginTop: 8 }} />}
           </View>
           <View style={styles.collectionImagePlaceholder}>
              <MaterialIcons name="wb-sunny" size={40} color="#fff" />
           </View>
        </Pressable>

        {/* Generated Outfits */}
        {hasGenerated && generatedOutfits.length > 0 ? (
          <View style={styles.outfitsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              CURATED FOR YOU
            </Text>
            {generatedOutfits.map((item, index) => (
               <View key={item.id} style={{ marginBottom: 24 }}>
                 {renderOutfitCard({ item, index })}
               </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
             {renderEmptyState()}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  searchBar: {
    marginHorizontal: 20,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  moodSection: {
    marginBottom: 24,
  },
  moodList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  moodPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 0, // Sharp or rounded? Design shows pills in some places, sharp in others. Let's go sharp for "Tabs" look.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodText: {
    fontSize: 12,
    letterSpacing: 1,
  },
  generateButton: {
    marginHorizontal: 20,
    height: 56,
    borderRadius: 0, // Sharp
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  generateButtonText: {
    fontSize: 14,
    letterSpacing: 2,
  },
  collectionCard: {
    marginHorizontal: 20,
    height: 160,
    borderRadius: 0,
    padding: 24,
    marginBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  collectionContent: {
    flex: 1,
    zIndex: 1,
  },
  collectionTitle: {
    fontSize: 20,
    marginBottom: 8,
    color: '#000',
  },
  collectionSubtitle: {
    fontSize: 14,
    color: '#555',
  },
  collectionImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitsContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    letterSpacing: 1,
  },
  outfitCard: {
    borderRadius: 0,
    backgroundColor: '#fff', // Or colors.surface
    padding: 0,
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  outfitHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outfitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#000',
  },
  outfitBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  demoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    backgroundColor: '#F0F0F1',
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveButtonText: {
    fontSize: 12,
    letterSpacing: 1,
  },
  outfitGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  outfitItemContainer: {
    flex: 1,
    aspectRatio: 0.75,
  },
  outfitItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  outfitItemLabel: {
    marginTop: 8,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  emptyActions: {
    width: '100%',
    gap: 16,
    marginTop: 24,
  },
  primaryButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    letterSpacing: 1,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    letterSpacing: 1,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  demoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  demoBannerText: {
    fontSize: 12,
    letterSpacing: 1,
  },
  exitDemoButton: {
    // unused
  },
  exitDemoText: {
    // unused
  },
});
