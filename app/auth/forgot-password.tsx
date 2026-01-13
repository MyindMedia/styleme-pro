import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await resetPassword(email.trim());

    setIsLoading(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.successContainer}>
          <View style={[styles.iconContainer, { backgroundColor: colors.success + "20" }]}>
            <MaterialIcons name="mark-email-read" size={48} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>
            Check Your Email
          </Text>
          <Text style={[styles.successMessage, { color: colors.muted }]}>
            We've sent a password reset link to{"\n"}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>{email}</Text>
          </Text>
          <Pressable
            onPress={() => router.replace("/auth/login")}
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.backButtonText, { color: colors.background }]}>
              Back to Sign In
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backNavButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
              <MaterialIcons name="lock-reset" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              No worries! Enter your email and we'll send you a reset link.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <MaterialIcons name="email" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
              </View>
            </View>

            <Pressable
              onPress={handleResetPassword}
              disabled={isLoading}
              style={[
                styles.resetButton,
                { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.resetButtonText, { color: colors.background }]}>
                  Send Reset Link
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backNavButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  form: {},
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  resetButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    height: 52,
    paddingHorizontal: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
