import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREMIUM_KEY = "@fitcheck_premium_status";
const TEST_ACCOUNT_KEY = "@fitcheck_test_account";

export interface PremiumStatus {
  isPremium: boolean;
  isTestAccount: boolean;
  tier: "free" | "pro" | "premium";
  features: {
    virtualTryOn: boolean;
    tripPacking: boolean;
    wishlistBlend: boolean;
    aiStyling: boolean;
    cloudSync: boolean;
    unlimitedItems: boolean;
    analytics: boolean;
  };
}

const FREE_FEATURES = {
  virtualTryOn: false,
  tripPacking: false,
  wishlistBlend: false,
  aiStyling: true, // Basic AI styling is free
  cloudSync: false,
  unlimitedItems: false,
  analytics: false,
};

const PREMIUM_FEATURES = {
  virtualTryOn: true,
  tripPacking: true,
  wishlistBlend: true,
  aiStyling: true,
  cloudSync: true,
  unlimitedItems: true,
  analytics: true,
};

export function usePremium() {
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    isTestAccount: false,
    tier: "free",
    features: FREE_FEATURES,
  });
  const [loading, setLoading] = useState(true);

  const loadPremiumStatus = useCallback(async () => {
    try {
      const premiumData = await AsyncStorage.getItem(PREMIUM_KEY);
      const testAccountData = await AsyncStorage.getItem(TEST_ACCOUNT_KEY);
      
      const isTestAccount = testAccountData === "true";
      const isPremium = premiumData === "true" || isTestAccount;
      
      setStatus({
        isPremium,
        isTestAccount,
        tier: isPremium ? "premium" : "free",
        features: isPremium ? PREMIUM_FEATURES : FREE_FEATURES,
      });
    } catch (error) {
      console.error("Error loading premium status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPremiumStatus();
  }, [loadPremiumStatus]);

  const enableTestPremium = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TEST_ACCOUNT_KEY, "true");
      await AsyncStorage.setItem(PREMIUM_KEY, "true");
      setStatus({
        isPremium: true,
        isTestAccount: true,
        tier: "premium",
        features: PREMIUM_FEATURES,
      });
      return true;
    } catch (error) {
      console.error("Error enabling test premium:", error);
      return false;
    }
  }, []);

  const disableTestPremium = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TEST_ACCOUNT_KEY, "false");
      await AsyncStorage.setItem(PREMIUM_KEY, "false");
      setStatus({
        isPremium: false,
        isTestAccount: false,
        tier: "free",
        features: FREE_FEATURES,
      });
      return true;
    } catch (error) {
      console.error("Error disabling test premium:", error);
      return false;
    }
  }, []);

  const checkFeature = useCallback((feature: keyof typeof PREMIUM_FEATURES): boolean => {
    return status.features[feature];
  }, [status.features]);

  return {
    ...status,
    loading,
    enableTestPremium,
    disableTestPremium,
    checkFeature,
    refresh: loadPremiumStatus,
  };
}

// Helper to initialize test premium account on app start
export async function initializeTestPremiumAccount(): Promise<void> {
  try {
    // Enable premium by default for testing
    await AsyncStorage.setItem(TEST_ACCOUNT_KEY, "true");
    await AsyncStorage.setItem(PREMIUM_KEY, "true");
    console.log("Test premium account initialized");
  } catch (error) {
    console.error("Error initializing test premium:", error);
  }
}
