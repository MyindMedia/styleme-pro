import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getClosetStats, ClothingCategory } from "@/lib/storage";

const { width } = Dimensions.get("window");

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

  const loadStats = useCallback(async () => {
    const data = await getClosetStats();
    setStats(data);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const menuItems = [
    { icon: "person-outline", label: "Edit Profile", action: () => {} },
    { icon: "notifications-none", label: "Notifications", action: () => {} },
    { icon: "palette", label: "Appearance", action: () => {} },
    { icon: "lock-outline", label: "Privacy", action: () => {} },
    { icon: "help-outline", label: "Help & Support", action: () => {} },
    { icon: "info-outline", label: "About", action: () => {} },
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
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>SM</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              Style Maven
            </Text>
            <Text style={[styles.profileEmail, { color: colors.muted }]}>
              Free Account
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              { backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialIcons name="edit" size={16} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Packing List Feature */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/packing" as any);
          }}
          style={({ pressed }) => [
            styles.featureBanner,
            { backgroundColor: colors.surface, opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <View style={styles.featureContent}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="luggage" size={24} color={colors.background} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                Trip Packing Lists
              </Text>
              <Text style={[styles.featureSubtitle, { color: colors.muted }]}>
                Smart packing based on weather & duration
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        </Pressable>

        {/* Pro Upgrade Banner */}
        <Pressable
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  item.action();
                }}
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
                <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
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
          <Text style={[styles.watermark, { color: colors.border }]}>STYLE</Text>
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
  featureBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  featureContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  featureSubtitle: {
    fontSize: 12,
  },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
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
    opacity: 0.8,
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
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  categoryCard: {
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
    paddingVertical: 10,
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
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
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
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
  },
  watermarkContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  watermark: {
    fontSize: 60,
    fontWeight: "900",
    letterSpacing: 15,
    opacity: 0.1,
  },
});
