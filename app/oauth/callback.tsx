import { useEffect, useState } from "react";
import { ActivityIndicator, Text, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/AuthContext";

export default function OAuthCallback() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    let isMounted = true;
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null;
    let errorTimeout: ReturnType<typeof setTimeout> | null = null;
    let checkAttempts = 0;
    const maxAttempts = 20; // 10 seconds max wait

    const checkForSession = async () => {
      try {
        console.log("[OAuth] Checking for session, attempt:", checkAttempts + 1);

        // Check for error in URL first
        if (Platform.OS === 'web') {
          const hash = window.location.hash;
          const search = window.location.search;

          // Check for error in hash or query params
          const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
          const searchParams = new URLSearchParams(search);

          const error = hashParams.get("error_description") ||
                       hashParams.get("error") ||
                       searchParams.get("error_description") ||
                       searchParams.get("error");

          if (error) {
            throw new Error(error);
          }
        }

        // Let Supabase handle the session detection automatically
        // The supabase client with detectSessionInUrl: true will parse the URL
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          console.log("[OAuth] Session found!");
          if (isMounted) {
            setStatus("success");
            redirectTimeout = setTimeout(() => {
              if (isMounted) {
                router.replace("/(tabs)");
              }
            }, 500);
          }
          return;
        }

        // No session yet, try again
        checkAttempts++;
        if (checkAttempts < maxAttempts) {
          setTimeout(() => {
            if (isMounted) {
              checkForSession();
            }
          }, 500);
        } else {
          throw new Error("Session detection timed out. Please try logging in again.");
        }

      } catch (err: any) {
        if (!isMounted) return;

        console.error("[OAuth] Error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
        errorTimeout = setTimeout(() => {
          if (isMounted) {
            router.replace("/auth/login");
          }
        }, 3000);
      }
    };

    // Start checking for session after a brief delay
    const initTimeout = setTimeout(() => {
      if (isMounted) {
        checkForSession();
      }
    }, 500);

    // Cleanup function
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
