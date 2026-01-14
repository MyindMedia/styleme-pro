import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/AuthContext";
import { ScreenContainer } from "@/components/screen-container";

const BENEFITS = [
  { icon: "auto-awesome", title: "Unlimited AI Scanning", desc: "Identify unlimited items with advanced AI." },
  { icon: "analytics", title: "Advanced Analytics", desc: "Unlock detailed insights, cost-per-wear, and more." },
  { icon: "remove-circle-outline", title: "Background Removal", desc: "Clean up your closet photos instantly." },
  { icon: "cloud-upload", title: "Unlimited Storage", desc: "Store as many outfits and items as you want." },
  { icon: "style", title: "Personal Stylist", desc: "Get AI-powered outfit recommendations." },
];

export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { upgradeToPro } = useAuth();

  const handleSubscribe = async () => {
    await upgradeToPro();
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Image / Hero */}
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="diamond" size={48} color="#FFD700" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Upgrade to Pro</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Unlock the full potential of your wardrobe.
          </Text>
        </View>

        {/* Benefits List */}
        <View style={styles.benefitsContainer}>
          {BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "15" }]}>
                <MaterialIcons name={benefit.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{benefit.title}</Text>
                <Text style={[styles.benefitDesc, { color: colors.muted }]}>{benefit.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Options */}
        <View style={styles.pricingContainer}>
          <Pressable 
            style={[styles.planCard, { borderColor: colors.primary, backgroundColor: colors.surface }]}
            onPress={handleSubscribe}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: colors.foreground }]}>Annual (Best Value)</Text>
              <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.saveText}>SAVE 50%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: colors.foreground }]}>$29.99<Text style={styles.period}>/year</Text></Text>
            <Text style={[styles.planTrial, { color: colors.muted }]}>7-day free trial, then $2.50/mo</Text>
          </Pressable>

          <Pressable 
            style={[styles.planCard, { borderColor: colors.border, backgroundColor: colors.surface, marginTop: 12 }]}
            onPress={handleSubscribe}
          >
             <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
            </View>
            <Text style={[styles.planPrice, { color: colors.foreground }]}>$4.99<Text style={styles.period}>/mo</Text></Text>
          </Pressable>
        </View>

        <Text style={[styles.disclaimer, { color: colors.muted }]}>
          Recurring billing. Cancel anytime.
        </Text>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable 
          onPress={handleSubscribe}
          style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.subscribeButtonText}>Start Free Trial</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.muted }]}>No thanks, I'll stay Free</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF9C4", // Light yellow
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    maxWidth: "80%",
  },
  benefitsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 14,
  },
  pricingContainer: {
    paddingHorizontal: 20,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "800",
  },
  period: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  planTrial: {
    fontSize: 12,
    marginTop: 4,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 24,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  subscribeButton: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    alignItems: "center",
    padding: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
