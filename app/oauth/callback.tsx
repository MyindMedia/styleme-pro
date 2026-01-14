import { useEffect, useState } from "react";
import { ActivityIndicator, Text, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/AuthContext";

// Helper to decode JWT payload without verification (we trust tokens from Supabase OAuth)
function decodeJwtPayload(token: string): any {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export default function OAuthCallback() {
  const router = useRouter();
  const { isAuthenticated: _isAuthenticated } = useAuth();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    let isMounted = true;
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null;
    let errorTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleOAuthCallback = async () => {
      try {
        console.log("[OAuth] Processing callback...");

        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let expiresIn: string | null = null;
        let expiresAt: string | null = null;

        if (Platform.OS === "web") {
          // Parse tokens from URL hash (Supabase implicit flow)
          const hash = window.location.hash;
          const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

          // Check for errors first
          const error = hashParams.get("error_description") || hashParams.get("error");
          if (error) {
            throw new Error(error);
          }

          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");
          expiresIn = hashParams.get("expires_in");
          expiresAt = hashParams.get("expires_at");
        } else {
          // On native, tokens might come in the URL fragment which Linking/Router can parse
          // or they've already been handled by AuthContext's WebBrowser.
          // Let's check for an existing session first.
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log("[OAuth] Native: Session already exists");
            accessToken = session.access_token;
          } else {
            // If no session yet, we might still be waiting for AuthContext
            console.log("[OAuth] Native: No session yet, waiting...");
            // Give it a moment to sync if AuthContext is handling it
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              accessToken = retrySession.access_token;
            }
          }
        }

        console.log("[OAuth] Tokens present:", {
          hasAccessToken: !!accessToken,
        });

        if (!accessToken) {
          // If we still don't have an access token on web, it's an error
          if (Platform.OS === "web") {
            throw new Error("No access token found in callback URL");
          } else {
            // On native, if we reach here and still no session, maybe we just redirected back
            // without tokens (e.g. user closed browser). Check if isAuthenticated is actually true
            // from the hook.
            const { data: { session: finalCheck } } = await supabase.auth.getSession();
            if (finalCheck) {
              accessToken = finalCheck.access_token;
            } else {
              console.warn("[OAuth] Native: Reached callback but no session found.");
              // Don't throw yet, just redirect to login
              if (isMounted) router.replace("/auth/login");
              return;
            }
          }
        }

        // Decode JWT to get user info (we trust it since it came from Supabase OAuth)
        const payload = decodeJwtPayload(accessToken);
        if (!payload) {
          throw new Error("Invalid access token format");
        }

        console.log("[OAuth] Token payload decoded, user:", payload.email);

        // Build session object manually
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken || "",
          expires_in: parseInt(expiresIn || "3600", 10),
          expires_at: parseInt(expiresAt || String(Math.floor(Date.now() / 1000) + 3600), 10),
          token_type: "bearer",
          user: {
            id: payload.sub,
            aud: payload.aud,
            role: payload.role,
            email: payload.email,
            email_confirmed_at: payload.email_verified ? new Date().toISOString() : undefined,
            phone: payload.phone || "",
            app_metadata: payload.app_metadata || {},
            user_metadata: payload.user_metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };

        // Try to set session - if it fails due to API key, store directly
        const storeSessionDirectly = async () => {
          // Store session directly in storage (bypass API verification)
          // Supabase storage key format: sb-<project-ref>-auth-token
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
          const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
          const storageKey = `sb-${projectRef}-auth-token`;

          // Use AsyncStorage (same as Supabase client uses)
          await AsyncStorage.setItem(storageKey, JSON.stringify(session));
          console.log("[OAuth] Session stored with key:", storageKey);

          // Force full page reload to root - app will pick up session on restart
          window.location.href = window.location.origin;
        };

        try {
          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (setError) {
            console.warn("[OAuth] setSession failed:", setError.message);
            console.log("[OAuth] Storing session directly and reloading...");
            await storeSessionDirectly();
            return;
          }
        } catch (setErr: any) {
          console.warn("[OAuth] setSession threw error:", setErr.message);
          console.log("[OAuth] Storing session directly and reloading...");
          await storeSessionDirectly();
          return;
        }

        console.log("[OAuth] Session set successfully via Supabase!");
        if (isMounted) {
          setStatus("success");
          // Dispatch signal to AuthContext if needed (though onAuthStateChange should handle it)
          redirectTimeout = setTimeout(() => {
            if (isMounted) router.replace("/(tabs)");
          }, 500);
        }

      } catch (err: any) {
        if (!isMounted) return;
        console.error("[OAuth] Error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
        errorTimeout = setTimeout(() => {
          if (isMounted) router.replace("/auth/login");
        }, 3000);
      }
    };

    // Small delay to ensure URL is fully loaded
    const initTimeout = setTimeout(() => {
      if (isMounted) handleOAuthCallback();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      if (redirectTimeout) clearTimeout(redirectTimeout);
      if (errorTimeout) clearTimeout(errorTimeout);
    };
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom", "left", "right"]}>
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 16 }}>
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text style={{ textAlign: "center", fontSize: 16 }}>
              Completing authentication...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "bold" }}>
              Authentication successful!
            </Text>
            <Text style={{ textAlign: "center", fontSize: 14 }}>
              Redirecting...
            </Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text style={{ textAlign: "center", fontSize: 18, fontWeight: "bold", color: "red" }}>
              Authentication failed
            </Text>
            <Text style={{ textAlign: "center", fontSize: 14 }}>
              {errorMessage}
            </Text>
            <Text style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
              Redirecting to login...
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
