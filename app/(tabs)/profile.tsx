import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Switch,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getClosetStats, ClothingCategory } from "@/lib/storage";
import { scheduleDailyReminder, cancelNotifications, registerForPushNotificationsAsync } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";

const { width: _width } = Dimensions.get("window");

const CATEGORY_ICONS: Record<ClothingCategory, string> = {
  tops: "checkroom",
  bottoms: "straighten",
  shoes: "ice-skating",
  accessories: "watch",
  outerwear: "ac-unit",
  dresses: "dry-cleaning",
  swimwear: "pool",
};

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const {
    user,
    profile,
    isAuthenticated,
    isPro,
    signOut,
    upgradeToPro,
    presentCustomerCenter,
    showPaywall,
  } = useAuth();
  const [_darkMode, setDarkMode] = useState(false);

  const loadStats = useCallback(async () => {
    const data = await getClosetStats();
    setStats(data);

    // Load settings
    const notifications = await AsyncStorage.getItem("notifications_enabled");
    setNotificationsEnabled(notifications === "true");
    const theme = await AsyncStorage.getItem("dark_mode");
    setDarkMode(theme === "true");
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isAuthenticated) {
      router.push("/auth/login");
    } else {
      Alert.alert("Edit Profile", "Profile editing is coming soon to the app!");
    }
  };

  const handleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem("notifications_enabled", newValue.toString());
    Alert.alert(
      newValue ? "Notifications Enabled" : "Notifications Disabled",
      newValue
        ? "You'll receive daily outfit reminders and style tips."
        : "You won't receive any notifications."
    );
  };

  const handleAppearance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Appearance",
      "Choose your preferred theme",
      [
        {
          text: "Light Mode", onPress: async () => {
            setDarkMode(false);
            await AsyncStorage.setItem("dark_mode", "false");
          }
        },
        {
          text: "Dark Mode", onPress: async () => {
            setDarkMode(true);
            await AsyncStorage.setItem("dark_mode", "true");
          }
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handlePrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Privacy Settings",
      "Manage your data and privacy preferences",
      [
        {
          text: "Clear All Data", style: "destructive", onPress: () => {
            Alert.alert(
              "Clear All Data?",
              "This will delete all your closet items, outfits, and settings. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Clear", style: "destructive", onPress: async () => {
                    await AsyncStorage.clear();
                    Alert.alert("Data Cleared", "All your data has been deleted.");
                    loadStats();
                  }
                },
              ]
            );
          }
        },
        { text: "Export My Data", onPress: () => Alert.alert("Coming Soon", "Data export feature is coming soon!") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleHelp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Help & Support",
      "How can we help you?",
      [
        { text: "FAQs", onPress: () => Alert.alert("FAQs", "Q: How do I add items?\nA: Tap the + button on the Closet tab.\n\nQ: How does AI styling work?\nA: Add at least 2 items, then go to Style Me tab and tap Generate Looks.\n\nQ: Is my data synced?\nA: Currently data is stored locally. Cloud sync coming soon!") },
        { text: "Contact Support", onPress: () => Linking.openURL("mailto:support@fitcheck.app") },
        { text: "Rate the App", onPress: () => Alert.alert("Thank You!", "App Store rating coming soon!") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleAbout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "About FitCheck",
      "Version 1.0.0\n\nFitCheck is your AI-powered personal stylist and wardrobe manager.\n\nFeatures:\n• Digital closet organization\n• AI outfit suggestions\n• Outfit shuffle & randomizer\n• Wishlist with wardrobe blend\n• Trip packing lists\n• Style tracking calendar\n\nMade with ❤️ by MyindMedia",
      [{ text: "OK" }]
    );
  };

  const handleUpgradePro = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPro) {
      Alert.alert("Pro Active", "You are already a Pro member! Thank you for your support.");
      return;
    }
    showPaywall();
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isAuthenticated) {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: () => signOut() },
        ]
      );
    } else {
      router.push("/auth/login");
    }
  };

  const menuItems = [
    { icon: "person-outline", label: "Edit Profile", action: handleEditProfile },
    ...(isPro ? [{ icon: "card-membership", label: "Manage Subscription", action: presentCustomerCenter }] : []),
    { icon: "notifications-none", label: "Notifications", action: handleNotifications, hasToggle: true, toggleValue: notificationsEnabled },
    { icon: "palette", label: "Appearance", action: handleAppearance },
    { icon: "help-outline", label: "Help & Support", action: handleHelp },
    { icon: "info-outline", label: "About", action: handleAbout },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>PROFILE</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
            {profile?.avatar_url || user?.user_metadata.avatar_url ? (
              <Image
                source={{ uri: profile?.avatar_url || user?.user_metadata.avatar_url }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <MaterialIcons name="person" size={40} color={colors.muted} />
            )}
            <Pressable
              onPress={handleEditProfile}
              style={[styles.editBadge, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="edit" size={14} color="#fff" />
            </Pressable>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {profile?.full_name || user?.user_metadata.full_name || "Guest User"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.muted }]}>
              {user?.email || "Sign in to sync your data"}
            </Text>
            {isPro && (
              <View style={[styles.proBadge, { backgroundColor: "#000" }]}>
                <Text style={[styles.proBadgeText, { color: "#fff" }]}>PRO MEMBER</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pro Banner */}
        {!isPro && (
          <Pressable
            onPress={handleUpgradePro}
            style={[styles.proBanner, { backgroundColor: "#000" }]}
          >
            <View>
              <Text style={[styles.proBannerTitle, { color: "#fff", fontFamily: 'PlayfairDisplay_700Bold' }]}>
                UPGRADE TO PRO
              </Text>
              <Text style={[styles.proBannerSubtitle, { color: "#ccc" }]}>
                Unlimited items & AI styling
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
        )}

        {/* Closet Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {stats?.totalItems || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>TOTAL ITEMS</Text>
            </View>
            <View style={[styles.statCard, { borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                ${(stats?.totalValue || 0).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>VALUE</Text>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.action}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuItemLeft}>
                <Text style={[styles.menuText, { color: colors.foreground, fontFamily: 'PlayfairDisplay_500Medium' }]}>{item.label}</Text>
              </View>
              {item.hasToggle ? (
                <Switch
                  value={item.toggleValue}
                  onValueChange={item.action}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          style={[styles.signOutButton, { borderColor: colors.border }]}
        >
          <Text style={[
            styles.signOutText,
            { color: isAuthenticated ? colors.error || "#FF4B4B" : colors.primary, fontFamily: 'PlayfairDisplay_600SemiBold' }
          ]}>
            {isAuthenticated ? "SIGN OUT" : "SIGN IN"}
          </Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 20,
    letterSpacing: 2,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 0, // Sharp
    marginBottom: 32,
  },
  proBannerTitle: {
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: 4,
  },
  proBannerSubtitle: {
    fontSize: 12,
  },
  statsSection: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderRadius: 0, // Sharp
  },
  statValue: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  signOutButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 30,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 12,
    letterSpacing: 1,
  },
});
