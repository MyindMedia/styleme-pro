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
    Alert.alert(
      "Edit Profile",
      "Profile editing will be available after signing in with your account.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => Alert.alert("Coming Soon", "Sign in feature is coming soon!") },
      ]
    );
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
        { text: "Light Mode", onPress: async () => {
          setDarkMode(false);
          await AsyncStorage.setItem("dark_mode", "false");
        }},
        { text: "Dark Mode", onPress: async () => {
          setDarkMode(true);
          await AsyncStorage.setItem("dark_mode", "true");
        }},
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
        { text: "Clear All Data", style: "destructive", onPress: () => {
          Alert.alert(
            "Clear All Data?",
            "This will delete all your closet items, outfits, and settings. This cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: async () => {
                await AsyncStorage.clear();
                Alert.alert("Data Cleared", "All your data has been deleted.");
                loadStats();
              }},
            ]
          );
        }},
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
    Alert.alert(
      "Upgrade to Pro",
      "Unlock premium features:\n\n✓ Unlimited closet items\n✓ Virtual Try-On\n✓ Advanced AI styling\n✓ Priority support\n✓ No ads\n\n$14.99/month or $99.99/year",
      [
        { text: "Maybe Later", style: "cancel" },
        { text: "Subscribe", onPress: () => Alert.alert("Coming Soon", "In-app purchases will be available soon!") },
      ]
    );
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Sign Out",
      "You're currently using FitCheck as a guest. Sign in to sync your wardrobe across devices.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => Alert.alert("Coming Soon", "Sign in feature is coming soon!") },
      ]
    );
  };

  const menuItems = [
    { icon: "person-outline", label: "Edit Profile", action: handleEditProfile },
    { icon: "notifications-none", label: "Notifications", action: handleNotifications, hasToggle: true, toggleValue: notificationsEnabled },
    { icon: "palette", label: "Appearance", action: handleAppearance },
    { icon: "lock-outline", label: "Privacy", action: handlePrivacy },
    { icon: "help-outline", label: "Help & Support", action: handleHelp },
    { icon: "info-outline", label: "About", action: handleAbout },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: "transparent" }]}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 56, height: 56, borderRadius: 28 }}
              contentFit="cover"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              FitCheck User
            </Text>
            <Text style={[styles.profileEmail, { color: colors.muted }]}>
              Free Account
            </Text>
          </View>
          <Pressable
            onPress={handleEditProfile}
            style={({ pressed }) => [
              styles.editButton,
              { backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialIcons name="edit" size={16} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
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
            <MaterialIcons name="favorite" size={24} color="#E91E63" />
            <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Wishlist</Text>
          </Pressable>
          
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
            <MaterialIcons name="shuffle" size={24} color="#9C27B0" />
            <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Shuffle</Text>
          </Pressable>
          
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/packing" as any);
            }}
            style={({ pressed }) => [
              styles.quickActionCard,
              { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <MaterialIcons name="luggage" size={24} color="#FF9800" />
            <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>Packing</Text>
          </Pressable>
        </View>

        {/* Pro Upgrade Banner */}
        <Pressable
          onPress={handleUpgradePro}
          style={({ pressed }) => [
            styles.proBanner,
            { backgroundColor: colors.primary, opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <View style={styles.proContent}>
            <MaterialIcons name="workspace-premium" size={24} color={colors.background} />
            <View style={styles.proText}>
              <Text style={[styles.proTitle, { color: colors.background }]}>
                Upgrade to Pro
              </Text>
              <Text style={[styles.proSubtitle, { color: colors.background }]}>
                Unlimited items, Virtual Try-On & more
              </Text>
            </View>
          </View>
          <View style={[styles.proPrice, { backgroundColor: colors.background }]}>
            <Text style={[styles.proPriceText, { color: colors.foreground }]}>
              $14.99/mo
            </Text>
          </View>
        </Pressable>

        {/* Closet Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Closet Overview
          </Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="checkroom" size={24} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {stats?.totalItems || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Total Items</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="attach-money" size={24} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                ${(stats?.totalValue || 0).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Closet Value</Text>
            </View>
          </View>

          {/* Category Breakdown */}
          {stats?.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0 && (
            <View style={[styles.categoryCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                By Category
              </Text>
              {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <MaterialIcons
                      name={CATEGORY_ICONS[category as ClothingCategory] as any}
                      size={18}
                      color={colors.muted}
                    />
                    <Text style={[styles.categoryName, { color: colors.foreground }]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </View>
                  <Text style={[styles.categoryCount, { color: colors.muted }]}>
                    {count as number}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Settings
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
            {menuItems.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={item.action}
                style={({ pressed }) => [
                  styles.menuItem,
                  index < menuItems.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.menuLeft}>
                  <MaterialIcons name={item.icon as any} size={22} color={colors.muted} />
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                    {item.label}
                  </Text>
                </View>
                {item.hasToggle ? (
                  <Switch
                    value={item.toggleValue}
                    onValueChange={item.action}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </Pressable>

        {/* Watermark */}
        <View style={styles.watermarkContainer}>
          <Text style={[styles.watermark, { color: colors.border }]}>FITCHECK</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActions: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  proContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proText: {
    gap: 2,
  },
  proTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  proSubtitle: {
    fontSize: 12,
    opacity: 0.9,
  },
  proPrice: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  proPriceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  categoryCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryName: {
    fontSize: 14,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuSection: {
    marginBottom: 20,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    fontSize: 15,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
  },
  watermarkContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  watermark: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 8,
    opacity: 0.1,
  },
});
