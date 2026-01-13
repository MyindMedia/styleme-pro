import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getClothingItems, ClothingItem } from "@/lib/storage";
import { trpc } from "@/lib/trpc";

const { width } = Dimensions.get("window");

const WEATHER_ICONS: Record<string, string> = {
  sunny: "wb-sunny",
  cloudy: "cloud",
  rainy: "water-drop",
  snowy: "ac-unit",
  thunderstorm: "flash-on",
  foggy: "blur-on",
};

const WEATHER_COLORS: Record<string, string> = {
  sunny: "#FFB300",
  cloudy: "#78909C",
  rainy: "#42A5F5",
  snowy: "#E3F2FD",
  thunderstorm: "#7E57C2",
  foggy: "#B0BEC5",
};

export default function WeatherOutfitScreen() {
  const colors = useColors();
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [outfitSuggestions, setOutfitSuggestions] = useState<any[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<string>("casual");

  const weatherMutation = trpc.weather.getOutfitRecommendation.useMutation();

  const OCCASIONS = [
    { key: "casual", label: "Casual", icon: "weekend" },
    { key: "work", label: "Work", icon: "business-center" },
    { key: "date-night", label: "Date", icon: "favorite" },
    { key: "athletic", label: "Workout", icon: "fitness-center" },
    { key: "outdoor", label: "Outdoor", icon: "park" },
  ];

  useEffect(() => {
    const init = async () => {
      // Load closet items
      const items = await getClothingItems();
      setClosetItems(items);

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "Please enable location access to get weather-based outfit recommendations.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }

      // Get current location
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    };

    init();
  }, []);

  useEffect(() => {
    if (location && closetItems.length > 0) {
      fetchWeatherRecommendation();
    } else if (location && closetItems.length === 0) {
      setIsLoading(false);
    }
  }, [location, selectedOccasion]);

  const fetchWeatherRecommendation = async () => {
    if (!location) return;

    setIsLoading(true);
    try {
      const result = await weatherMutation.mutateAsync({
        latitude: location.latitude,
        longitude: location.longitude,
        closetItems: closetItems.map((item) => ({
          id: item.id,
          name: item.name || `${item.brand} ${item.type}`,
          category: item.category,
          type: item.type,
          color: item.color,
          style: item.style,
          seasons: item.seasons,
          occasions: item.occasions,
        })),
        occasion: selectedOccasion,
      });

      if (result.success) {
        setWeatherData(result.weather);
        setRecommendation(result.recommendation);
        setOutfitSuggestions(result.outfitSuggestions || []);
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
      Alert.alert("Error", "Failed to get weather recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getItemById = (id: string) => closetItems.find((item) => item.id === id);

  const renderWeatherCard = () => {
    if (!weatherData) return null;

    const iconName = WEATHER_ICONS[weatherData.icon] || "wb-sunny";
    const iconColor = WEATHER_COLORS[weatherData.icon] || colors.primary;

    return (
      <View style={[styles.weatherCard, { backgroundColor: colors.surface }]}>
        <View style={styles.weatherMain}>
          <View style={[styles.weatherIconContainer, { backgroundColor: iconColor + "20" }]}>
            <MaterialIcons name={iconName as any} size={48} color={iconColor} />
          </View>
          <View style={styles.weatherInfo}>
            <Text style={[styles.temperature, { color: colors.foreground }]}>
              {Math.round(weatherData.temperature)}°F
            </Text>
            <Text style={[styles.feelsLike, { color: colors.muted }]}>
              Feels like {Math.round(weatherData.feelsLike)}°F
            </Text>
            <Text style={[styles.condition, { color: colors.foreground }]}>
              {weatherData.condition}
            </Text>
          </View>
        </View>
        <View style={styles.weatherDetails}>
          <View style={styles.weatherDetail}>
            <MaterialIcons name="water-drop" size={16} color={colors.muted} />
            <Text style={[styles.weatherDetailText, { color: colors.muted }]}>
              {weatherData.humidity}%
            </Text>
          </View>
          <View style={styles.weatherDetail}>
            <MaterialIcons name="air" size={16} color={colors.muted} />
            <Text style={[styles.weatherDetailText, { color: colors.muted }]}>
              {Math.round(weatherData.windSpeed)} mph
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRecommendation = () => {
    if (!recommendation) return null;

    return (
      <View style={[styles.recommendationCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Today's Style Advice
        </Text>
        <Text style={[styles.recommendationSummary, { color: colors.foreground }]}>
          {recommendation.summary}
        </Text>

        {recommendation.layers && (
          <View style={styles.recommendationRow}>
            <MaterialIcons name="layers" size={18} color={colors.primary} />
            <Text style={[styles.recommendationText, { color: colors.muted }]}>
              {recommendation.layers}
            </Text>
          </View>
        )}

        {recommendation.fabricSuggestions?.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={[styles.tagLabel, { color: colors.muted }]}>Recommended Fabrics:</Text>
            <View style={styles.tagRow}>
              {recommendation.fabricSuggestions.map((fabric: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.success + "20" }]}>
                  <Text style={[styles.tagText, { color: colors.success }]}>{fabric}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recommendation.avoidFabrics?.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={[styles.tagLabel, { color: colors.muted }]}>Avoid:</Text>
            <View style={styles.tagRow}>
              {recommendation.avoidFabrics.map((fabric: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.error + "20" }]}>
                  <Text style={[styles.tagText, { color: colors.error }]}>{fabric}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recommendation.accessories?.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={[styles.tagLabel, { color: colors.muted }]}>Don't Forget:</Text>
            <View style={styles.tagRow}>
              {recommendation.accessories.map((acc: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{acc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderOutfitSuggestion = (outfit: any, index: number) => {
    const items = outfit.itemIds
      ?.map((id: string) => getItemById(id))
      .filter(Boolean) as ClothingItem[];

    if (!items || items.length === 0) return null;

    return (
      <View key={index} style={[styles.outfitCard, { backgroundColor: colors.surface }]}>
        <View style={styles.outfitHeader}>
          <Text style={[styles.outfitName, { color: colors.foreground }]}>
            {outfit.name || `Look ${index + 1}`}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.outfitItems}>
            {items.map((item, idx) => (
              <View key={idx} style={styles.outfitItemContainer}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.outfitItemImage}
                  contentFit="cover"
                />
                <Text style={[styles.outfitItemLabel, { color: colors.muted }]} numberOfLines={1}>
                  {item.type}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        {outfit.reason && (
          <Text style={[styles.outfitReason, { color: colors.muted }]}>
            {outfit.reason}
          </Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Getting weather data...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (closetItems.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Weather Outfit</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <MaterialIcons name="cloud" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Add Items First
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Add clothes to your closet to get weather-based outfit recommendations.
          </Text>
          <Pressable
            onPress={() => router.push("/add-item")}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={[styles.addButtonText, { color: colors.background }]}>Add Items</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Weather Outfit</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            fetchWeatherRecommendation();
          }}
          style={({ pressed }) => [styles.refreshButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name="refresh" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Occasion Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.occasionList}
        >
          {OCCASIONS.map((occasion) => (
            <Pressable
              key={occasion.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedOccasion(occasion.key);
              }}
              style={({ pressed }) => [
                styles.occasionPill,
                {
                  backgroundColor:
                    selectedOccasion === occasion.key ? colors.primary : colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <MaterialIcons
                name={occasion.icon as any}
                size={18}
                color={selectedOccasion === occasion.key ? colors.background : colors.foreground}
              />
              <Text
                style={[
                  styles.occasionText,
                  {
                    color:
                      selectedOccasion === occasion.key ? colors.background : colors.foreground,
                  },
                ]}
              >
                {occasion.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Weather Card */}
        {renderWeatherCard()}

        {/* Recommendation */}
        {renderRecommendation()}

        {/* Outfit Suggestions */}
        {outfitSuggestions.length > 0 && (
          <View style={styles.outfitsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 16 }]}>
              Suggested Outfits
            </Text>
            {outfitSuggestions.map((outfit, index) => renderOutfitSuggestion(outfit, index))}
          </View>
        )}

        <View style={{ height: 100 }} />
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  occasionList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  occasionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  occasionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  weatherCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
  },
  weatherMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  weatherIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  weatherInfo: {
    flex: 1,
  },
  temperature: {
    fontSize: 42,
    fontWeight: "700",
  },
  feelsLike: {
    fontSize: 14,
    marginTop: 2,
  },
  condition: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  weatherDetails: {
    flexDirection: "row",
    marginTop: 16,
    gap: 24,
  },
  weatherDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weatherDetailText: {
    fontSize: 14,
  },
  recommendationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  recommendationSummary: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  recommendationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    flex: 1,
  },
  tagSection: {
    marginTop: 12,
  },
  tagLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  outfitsSection: {
    marginTop: 8,
  },
  outfitCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  outfitHeader: {
    marginBottom: 12,
  },
  outfitName: {
    fontSize: 16,
    fontWeight: "600",
  },
  outfitItems: {
    flexDirection: "row",
    gap: 12,
  },
  outfitItemContainer: {
    alignItems: "center",
    width: 80,
  },
  outfitItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  outfitItemLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  outfitReason: {
    fontSize: 13,
    marginTop: 12,
    fontStyle: "italic",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
