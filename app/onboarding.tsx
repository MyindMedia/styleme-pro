import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Platform,
  ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof SLIDE_ICONS;
  features: string[];
}

const SLIDE_ICONS = {
  dress: "checkroom",
  camera: "photo-camera",
  sparkle: "auto-awesome",
  diamond: "diamond",
} as const;

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    title: "Welcome to FitCheck",
    description: "Your AI-powered personal stylist and wardrobe manager",
    icon: "dress",
    features: [
      "Digitize your entire wardrobe",
      "Get AI outfit suggestions",
      "Track what you wear",
    ],
  },
  {
    id: "closet",
    title: "Build Your Digital Closet",
    description: "Add items by photo, URL, or manual entry",
    icon: "camera",
    features: [
      "AI auto-detects brand, color & type",
      "Automatic background removal",
      "Organize by category & occasion",
    ],
  },
  {
    id: "style",
    title: "AI Styling Assistant",
    description: "Get personalized outfit recommendations",
    icon: "sparkle",
    features: [
      "Mood-based outfit generation",
      "Weather-appropriate suggestions",
      "Mix & match with shuffle",
    ],
  },
  {
    id: "features",
    title: "Premium Features",
    description: "Unlock the full FitCheck experience",
    icon: "diamond",
    features: [
      "Virtual try-on with your photo",
      "Trip packing lists by weather",
      "Wishlist wardrobe blending",
    ],
  },
];

const ONBOARDING_KEY = "@fitcheck_onboarding_complete";

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      }
    },
    [currentIndex]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const goToSlide = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving onboarding state:", error);
      router.replace("/(tabs)");
    }
  };

  const handleAddFirstItem = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      router.replace("/add-item");
    } catch (error) {
      router.replace("/add-item");
    }
  };

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          <MaterialIcons
            name={SLIDE_ICONS[item.icon]}
            size={56}
            color={colors.primary}
          />
        </View>

        {/* Title & Description */}
        <Text style={[styles.title, { color: colors.foreground }]}>
          {item.title}
        </Text>
        <Text style={[styles.description, { color: colors.muted }]}>
          {item.description}
        </Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {item.features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="check" size={14} color="#fff" />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Skip Button */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <View style={styles.slidesContainer}>
          <FlatList
            ref={flatListRef}
            data={ONBOARDING_SLIDES}
            renderItem={renderSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            bounces={false}
          />
        </View>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToSlide(index)}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? colors.foreground : colors.border,
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {isLastSlide ? (
            <View style={styles.finalButtons}>
              <TouchableOpacity
                onPress={handleAddFirstItem}
                style={[styles.primaryButton, { backgroundColor: colors.foreground }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                  Add Your First Item
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={completeOnboarding}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                  Explore First
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextButton, { backgroundColor: colors.foreground }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextButtonText, { color: colors.background }]}>
                Next
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    height: 48,
  },
  headerSpacer: {
    width: 60,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  slidesContainer: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    width: "100%",
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  finalButtons: {
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
