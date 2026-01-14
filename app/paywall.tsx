import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/AuthContext";
import { ScreenContainer } from "@/components/screen-container";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useState } from "react";

const BENEFITS = [
  { icon: "auto-awesome", title: "Unlimited AI Scanning", desc: "Identify unlimited items with advanced AI." },
  { icon: "analytics", title: "Advanced Analytics", desc: "Unlock detailed insights, cost-per-wear, and more." },
  { icon: "cloud-upload", title: "Unlimited Storage", desc: "Store as many outfits and items as you want." },
  { icon: "style", title: "Personal Stylist", desc: "Get AI-powered outfit recommendations." },
];

export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { offerings, upgradeToPro } = useAuth(); // We'll keep upgradeToPro as a fallback or for syncing
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  // Set default selected package to annual if available, or the first one
  if (!selectedPackage && offerings.length > 0) {
    const annual = offerings.find(p => p.packageType === "ANNUAL");
    if (annual) setSelectedPackage(annual);
    else setSelectedPackage(offerings[0]);
  }

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    
    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      
      if (customerInfo.entitlements.active["pro"]) {
        // Successful purchase
        await upgradeToPro(); // Sync with Supabase
        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase Failed", e.message);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active["pro"]) {
        await upgradeToPro(); // Sync with Supabase
        Alert.alert("Success", "Your purchases have been restored.");
        router.back();
      } else {
        Alert.alert("No Purchases", "No active subscriptions found to restore.");
      }
    } catch (e: any) {
      Alert.alert("Restore Failed", e.message);
    } finally {
      setIsPurchasing(false);
    }
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
          {offerings.length > 0 ? (
            offerings.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const isAnnual = pkg.packageType === "ANNUAL";
              
              return (
                <Pressable 
                  key={pkg.identifier}
                  style={[
                    styles.planCard, 
                    { 
                      borderColor: isSelected ? colors.primary : colors.border, 
                      backgroundColor: colors.surface,
                      marginTop: 12
                    }
                  ]}
                  onPress={() => setSelectedPackage(pkg)}
                >
                  <View style={styles.planHeader}>
                    <Text style={[styles.planName, { color: colors.foreground }]}>{pkg.product.title}</Text>
                    {isAnnual && (
                      <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.saveText}>BEST VALUE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.planPrice, { color: colors.foreground }]}>
                    {pkg.product.priceString}
                    <Text style={styles.period}>
                      {isAnnual ? "/year" : "/mo"}
                    </Text>
                  </Text>
                  {pkg.product.introPrice && (
                    <Text style={[styles.planTrial, { color: colors.muted }]}>
                      {pkg.product.introPrice.periodNumberOfUnits} {pkg.product.introPrice.periodUnit.toLowerCase()} free trial
                    </Text>
                  )}
                </Pressable>
              );
            })
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.muted, marginTop: 8 }}>Loading plans...</Text>
              {/* Fallback for development/mocking */}
              <Pressable 
                style={[styles.planCard, { borderColor: colors.primary, backgroundColor: colors.surface, marginTop: 20 }]}
                onPress={() => {
                  // Allow manual mock upgrade in dev mode if no offerings found
                  Alert.alert(
                    "Dev Mode", 
                    "No offerings found (expected in Simulator/Expo Go without native setup). Enable Pro anyway?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Yes, Enable Pro", onPress: async () => {
                        await upgradeToPro();
                        router.back();
                      }}
                    ]
                  );
                }}
              >
                <Text style={[styles.planName, { color: colors.foreground, textAlign: "center" }]}>
                  Development Mock Plan
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable onPress={handleRestore} style={{ marginTop: 24, alignSelf: "center" }}>
          <Text style={[styles.restoreText, { color: colors.muted }]}>Restore Purchases</Text>
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.muted }]}>
          Recurring billing. Cancel anytime.
        </Text>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable 
          onPress={handlePurchase}
          disabled={isPurchasing || (offerings.length > 0 && !selectedPackage)}
          style={[
            styles.subscribeButton, 
            { 
              backgroundColor: colors.primary,
              opacity: isPurchasing || (offerings.length > 0 && !selectedPackage) ? 0.7 : 1 
            }
          ]}
        >
          {isPurchasing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPackage?.product.introPrice ? "Start Free Trial" : "Subscribe Now"}
            </Text>
          )}
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
  restoreText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
});
