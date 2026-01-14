import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Alert, Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Purchases, { LOG_LEVEL, PurchasesPackage } from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { syncLocalStorageToCloud } from "@/lib/storage";

// User profile type
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  storage_used: number;
  storage_limit: number;
  is_pro: boolean;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Auth context type
interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  offerings: PurchasesPackage[];

  // Auth methods
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: "google" | "apple" | "facebook") => Promise<{ error: AuthError | null }>;
  setSessionManually: (accessToken: string, refreshToken: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;

  // Profile methods
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  upgradeToPro: () => Promise<void>; // Mock upgrade
  showPaywall: () => Promise<void>; // RevenueCat Paywall
  presentCustomerCenter: () => Promise<void>; // RevenueCat Customer Center

  // Storage helpers
  getUserStoragePath: () => string;
  getStorageUsagePercent: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPro, setIsPro] = useState(false); // Default to free
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);

  const isAuthenticated = !!user && !!session;

  // Initialize RevenueCat
  useEffect(() => {
    const initRevenueCat = async () => {
      if (Platform.OS === "web") return;

      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
        android: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY,
      });

      if (!apiKey) {
        console.warn("RevenueCat API key not found");
        return;
      }

      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        await Purchases.configure({ apiKey });
        
        // Get initial customer info
        const customerInfo = await Purchases.getCustomerInfo();
        if (customerInfo.entitlements.active["pro"]) {
          setIsPro(true);
        }

        // Get offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length !== 0) {
          setOfferings(offerings.current.availablePackages);
        }
      } catch (e) {
        console.log("Error initializing RevenueCat", e);
      }
    };

    initRevenueCat();
  }, []);

  // Mock function to upgrade user
  const upgradeToPro = async () => {
    if (!user) return;
    
    // Optimistic update
    setIsPro(true);
    
    try {
      await supabase
        .from("user_profiles")
        .update({ is_pro: true })
        .eq("id", user.id);
        
      Alert.alert("Welcome to Pro!", "You now have access to all premium features.");
      refreshProfile();
    } catch (error) {
      console.error("Error upgrading to pro:", error);
      setIsPro(false);
      Alert.alert("Error", "Could not upgrade account. Please try again.");
    }
  };

  // Fetch user profile from database
  const fetchProfile = useCallback(async (user: User) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        // Create minimal profile if missing
        return {
          id: user.id,
          email: user.email || null,
          full_name: user.user_metadata.full_name || "User",
          avatar_url: null,
          storage_used: 0,
          storage_limit: 104857600, // 100MB
          is_pro: false,
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserProfile;
      }

      return data as UserProfile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Set a timeout to force loading to false if Supabase takes too long
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn("[AuthContext] Session check timed out, forcing loading=false");
        setIsLoading(false);
      }
    }, 5000); // 5 seconds timeout

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session) {
        setSession(session);
        setUser(session.user);

        const userProfile = await fetchProfile(session.user);
        if (isMounted) {
          setProfile(userProfile);
          if (userProfile) setIsPro(userProfile.is_pro || false);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsPro(false);
      }

      if (isMounted) {
        setIsLoading(false);
      }
      clearTimeout(timeoutId);
    }).catch(err => {
      console.error("[AuthContext] Session check failed:", err);
      if (isMounted) setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log("Auth state changed:", event);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userProfile = await fetchProfile(session.user);
          if (isMounted) {
            setProfile(userProfile);
            if (userProfile) setIsPro(userProfile.is_pro || false);
          }
          // Sync local storage to cloud
          if (event === "SIGNED_IN") {
            // Identify user in RevenueCat
            if (Platform.OS !== "web") {
              try {
                await Purchases.logIn(session.user.id);
                const customerInfo = await Purchases.getCustomerInfo();
                if (customerInfo.entitlements.active["pro"]) {
                  setIsPro(true);
                }
              } catch (e) {
                console.log("Error logging into RevenueCat", e);
              }
            }

            syncLocalStorageToCloud().then(result => {
              if (result.success && result.itemsCount > 0) {
                console.log(`[Auth] Synced ${result.itemsCount} local items to cloud`);
              }
            });
          }
        } else {
          setProfile(null);
          // Logout from RevenueCat
          if (Platform.OS !== "web" && event === "SIGNED_OUT") {
            try {
              await Purchases.logOut();
            } catch (e) {
              console.log("Error logging out of RevenueCat", e);
            }
          }
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign up with email/password
  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || "",
          },
        },
      });

      if (error) {
        return { error };
      }

      // Profile is created automatically via database trigger
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Sign in with OAuth provider
  const signInWithOAuth = async (provider: "google" | "apple" | "facebook") => {
    try {
      if (Platform.OS === "web") {
        const redirectTo = `${window.location.origin}/oauth/callback`;
        console.log(`[Auth] Initiating web OAuth with ${provider}, redirecting to: ${redirectTo}`);

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: false,
          },
        });
        return { error };
      } else {
        // Native platform handling
        setIsLoading(true);
        const redirectTo = Linking.createURL("/oauth/callback");
        console.log(`[Auth] Initiating native OAuth with ${provider}, redirecting to: ${redirectTo}`);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true, // Handle redirect manually
          },
        });

        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

          if (result.type === "success" && result.url) {
            // Extract tokens from URL fragment
            const fragment = result.url.split("#")[1];
            if (!fragment) {
              const query = result.url.split("?")[1];
              if (query) {
                const params = new URLSearchParams(query);
                const accessToken = params.get("access_token");
                const refreshToken = params.get("refresh_token");
                if (accessToken && refreshToken) {
                  return await setSessionManually(accessToken, refreshToken);
                }
              }
              throw new Error("No tokens found in redirect URL");
            }

            const params = new URLSearchParams(fragment);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
              return await setSessionManually(accessToken, refreshToken);
            }
          }
        }

        return { error: null };
      }
    } catch (error) {
      console.error("[Auth] OAuth error:", error);
      setIsLoading(false);
      return { error: error as AuthError };
    } finally {
      // In case of success, setSessionManually will handle setIsLoading(false)
      // But we check here as a safety measure
    }
  };

  // Manual session setter for callback
  const setSessionManually = async (accessToken: string, refreshToken: string) => {
    try {
      // Validate inputs
      if (!accessToken || !refreshToken) {
        throw new Error("Missing access token or refresh token");
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        // Fetch profile immediately
        const userProfile = await fetchProfile(data.session.user);
        setProfile(userProfile);

        // Sync local storage to cloud
        syncLocalStorageToCloud().then(result => {
          if (result.success && result.itemsCount > 0) {
            console.log(`[Auth] Synced ${result.itemsCount} local items to cloud (manual)`);
          }
        });

        // Force loading to false immediately
        setIsLoading(false);
      } else {
        // Session was not created - this shouldn't happen but handle it
        console.error("[Auth] setSession succeeded but no session returned");
        throw new Error("Session creation failed - no session returned");
      }

      return { error: null };
    } catch (error) {
      console.error("[Auth] setSessionManually error:", error);
      return { error: error as AuthError };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/auth/reset-password`
          : "styleme://auth/reset-password",
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error("No user logged in") };
    }

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        return { error };
      }

      // Refresh profile
      const updatedProfile = await fetchProfile(user);
      setProfile(updatedProfile);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Refresh profile from database
  const refreshProfile = async () => {
    if (user) {
      const updatedProfile = await fetchProfile(user);
      setProfile(updatedProfile);
    }
  };

  // Show RevenueCat Paywall
  const showPaywall = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not Supported", "Paywalls are not supported on web.");
      return;
    }

    try {
      const paywallResult = await RevenueCatUI.presentPaywall();
      
      switch (paywallResult) {
        case RevenueCatUI.PAYWALL_RESULT.PURCHASED:
        case RevenueCatUI.PAYWALL_RESULT.RESTORED:
          await upgradeToPro(); // Sync our database
          return;
        case RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED:
        case RevenueCatUI.PAYWALL_RESULT.ERROR:
        case RevenueCatUI.PAYWALL_RESULT.CANCELLED:
        default:
          return;
      }
    } catch (e) {
      console.error("Error presenting paywall:", e);
    }
  };

  // Present Customer Center
  const presentCustomerCenter = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not Supported", "Customer Center is not supported on web.");
      return;
    }

    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      console.error("Error presenting customer center:", e);
    }
  };

  // Get user's storage path (for organizing files by user)
  const getUserStoragePath = () => {
    if (!user) return "public";
    return user.id;
  };

  // Get storage usage percentage
  const getStorageUsagePercent = () => {
    if (!profile || profile.storage_limit === 0) return 0;
    return Math.round((profile.storage_used / profile.storage_limit) * 100);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    isPro,
    signUp,
    signIn,
    signInWithOAuth,
    setSessionManually,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    upgradeToPro,
    getUserStoragePath,
    getStorageUsagePercent,
    offerings,
    showPaywall,
    presentCustomerCenter,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default AuthContext;
