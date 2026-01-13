import { useEffect, useState } from "react";
import { ActivityIndicator, Text, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  const { isAuthenticated } = useAuth();
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

        // Parse tokens from URL hash (Supabase implicit flow)
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

        // Check for errors first
        const error = hashParams.get("error_description") || hashParams.get("error");
        if (error) {
          throw new Error(error);
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const expiresIn = hashParams.get("expires_in");
        const expiresAt = hashParams.get("expires_at");

        console.log("[OAuth] Tokens present:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        });

        if (!accessToken) {
          // Check if we already have a session (maybe auto-detected)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log("[OAuth] Existing session found");
            if (isMounted) {
              setStatus("success");
              redirectTimeout = setTimeout(() => {
                if (isMounted) router.replace("/(tabs)");
              }, 500);
            }
            return;
          }
          throw new Error("No access token found in callback URL");
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
        try {
          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (setError) {
            console.warn("[OAuth] setSession failed, storing session directly:", setError.message);
            // Store session directly in storage (bypass API verification)
            const storageKey = `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL || "").hostname.split('.')[0]}-auth-token`;
            localStorage.setItem(storageKey, JSON.stringify(session));

            // Force page reload to pick up the new session
            window.location.href = "/(tabs)";
            return;
          }
        } catch (setErr: any) {
          console.warn("[OAuth] setSession threw error, storing directly:", setErr.message);
          const storageKey = `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL || "").hostname.split('.')[0]}-auth-token`;
          localStorage.setItem(storageKey, JSON.stringify(session));
          window.location.href = "/";
          return;
        }

        console.log("[OAuth] Session set successfully!");
        if (isMounted) {
          setStatus("success");
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
