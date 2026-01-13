import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Alert } from "react-native";

// User profile type
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  storage_used: number;
  storage_limit: number;
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

  // Auth methods
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: "google" | "apple" | "facebook") => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;

  // Profile methods
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;

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

  const isAuthenticated = !!user && !!session;

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }

      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : "styleme://auth/callback",
        },
      });

      return { error };
    } catch (error) {
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
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Refresh profile from database
  const refreshProfile = async () => {
    if (user) {
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
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
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    getUserStoragePath,
    getStorageUsagePercent,
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
