import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, useColorScheme } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

// Theme colors matching theme.config.js
const THEME_COLORS = {
  light: {
    background: "#F5F2EE",
    logoBackground: "#FFFFFF",
    shadowColor: "#3D3D3D",
    taglineColor: "#8A8580",
  },
  dark: {
    background: "#1A1816",
    logoBackground: "#252220",
    shadowColor: "#000000",
    taglineColor: "#9A9590",
  },
};

export function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const [isComplete, setIsComplete] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  
  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(1);
  const logoRotate = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(10);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    onAnimationComplete();
  }, [onAnimationComplete]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const triggerSuccessHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  useEffect(() => {
    // Initial haptic when logo appears
    const hapticTimer = setTimeout(() => {
      triggerHaptic();
    }, 300);

    // Logo fade in and scale up
    logoOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSequence(
      withTiming(1.1, { duration: 500, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.cubic) })
    );
    
    // Subtle rotation with haptic at peak
    logoRotate.value = withSequence(
      withDelay(300, withTiming(5, { duration: 150 })),
      withTiming(-3, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );

    // Tagline fade in after logo settles
    taglineOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    taglineTranslateY.value = withDelay(
      600,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );

    // Success haptic when animation completes
    const successHapticTimer = setTimeout(() => {
      triggerSuccessHaptic();
    }, 900);

    // Fade out after delay
    backgroundOpacity.value = withDelay(
      1400,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      })
    );

    return () => {
      clearTimeout(hapticTimer);
      clearTimeout(successHapticTimer);
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
    opacity: logoOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  if (isComplete) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        containerAnimatedStyle,
        { backgroundColor: colors.background }
      ]}
    >
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.logoContainer, 
            logoAnimatedStyle,
            { 
              backgroundColor: colors.logoBackground,
              shadowColor: colors.shadowColor,
            }
          ]}
        >
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
        
        <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
          <Text style={[styles.tagline, { color: colors.taglineColor }]}>
            Your AI Stylist
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  logo: {
    width: 140,
    height: 140,
  },
  taglineContainer: {
    marginTop: 24,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
});
