import { useEffect, useState } from "react";
import { ActivityIndicator, Text, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { ThemedView } from "@/components/themed-view";

export default function OAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[OAuth] Callback handler triggered");
        
        // Get the initial URL or the current URL handled by Expo Router
        const url = await Linking.getInitialURL();
        const currentUrl = Linking.useURL?.(); // useURL hook might not be available inside async
        
        // Use the URL that triggered this route
        let activeUrl = currentUrl || url;
        
        console.log("[OAuth] Active URL:", activeUrl);

        if (!activeUrl) {
           throw new Error("No URL found");
        }

        // Parse the URL
        // Supabase sends tokens in the hash (implicit) or code in search (PKCE)
        // Format: styleme://oauth/callback#access_token=...&refresh_token=...
        // Or: styleme://oauth/callback?code=...
        
        // Handle hash fragment manually because Expo Router/Linking might put it in weird places
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let code: string | null = null;
        let error: string | null = null;

        // Check query params first (PKCE code or error)
        const parsedUrl = new URL(activeUrl);
        code = parsedUrl.searchParams.get("code");
        error = parsedUrl.searchParams.get("error_description") || parsedUrl.searchParams.get("error");

        // Check hash params (Implicit flow)
        if (parsedUrl.hash) {
          const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");
          if (!error) {
             error = hashParams.get("error_description") || hashParams.get("error");
          }
        }
        
        // Special case for Supabase Redirect: sometimes hash params are not in window.location.hash but in the URL itself if redirected strangely
        // e.g. /oauth/callback#access_token=...
        if (!accessToken && !code && Platform.OS === 'web') {
           const hash = window.location.hash;
           if (hash) {
              const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
              accessToken = hashParams.get("access_token");
              refreshToken = hashParams.get("refresh_token");
               if (!error) {
                 error = hashParams.get("error_description") || hashParams.get("error");
              }
           }
        }

        if (error) {
          throw new Error(error);
        }

        if (code) {
          console.log("[OAuth] Code found, exchanging for session...");
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          console.log("[OAuth] Code exchange successful");
        } else if (accessToken && refreshToken) {
          console.log("[OAuth] Tokens found, setting session...");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          console.log("[OAuth] Session set successful");
        } else {
          // If no code or tokens, maybe the session was already handled by auto-detection?
          // Or we are just loading the page without params.
          // Let's check if we have a session.
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
             console.log("[OAuth] No session found and no params.");
             // This might be a reload or navigation without params.
             // We can redirect to login or just wait.
             // But if we came here from a redirect, it failed.
             throw new Error("No authentication parameters found in URL");
          }
        }

        setStatus("success");
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 1000);

      } catch (err: any) {
        console.error("[OAuth] Error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
        // Redirect back to login after delay
        setTimeout(() => {
          router.replace("/auth/login");
        }, 3000);
      }
    };

    handleCallback();
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
