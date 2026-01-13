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
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signUp, signInWithOAuth } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return false;
    }
    if (!password) {
      Alert.alert("Missing Password", "Please create a password.");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await signUp(email.trim(), password, fullName.trim());

    setIsLoading(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Signup Failed", error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Check Your Email",
        "We've sent you a confirmation link. Please verify your email to continue.",
        [{ text: "OK", onPress: () => router.replace("/auth/login") }]
      );
    }
  };

  const handleOAuthSignup = async (provider: "google" | "apple") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await signInWithOAuth(provider);

    if (error) {
      Alert.alert("Signup Failed", error.message);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="checkroom" size={40} color={colors.background} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Start organizing your wardrobe today
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <MaterialIcons name="person" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="John Doe"
                  placeholderTextColor={colors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
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
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <MaterialIcons name="lock" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>Confirm Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <MaterialIcons name="lock-outline" size={20} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                />
              </View>
            </View>

            {/* Signup Button */}
            <Pressable
              onPress={handleSignup}
              disabled={isLoading}
              style={[
                styles.signupButton,
                { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.signupButtonText, { color: colors.background }]}>
                  Create Account
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>or sign up with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* OAuth Buttons */}
            <View style={styles.oauthContainer}>
              <Pressable
                onPress={() => handleOAuthSignup("google")}
                style={[styles.oauthButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="logo-google" size={20} color={colors.foreground} />
                <Text style={[styles.oauthButtonText, { color: colors.foreground }]}>Google</Text>
              </Pressable>

              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => handleOAuthSignup("apple")}
                  style={[styles.oauthButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <MaterialIcons name="apple" size={20} color={colors.foreground} />
                  <Text style={[styles.oauthButtonText, { color: colors.foreground }]}>Apple</Text>
                </Pressable>
              )}
            </View>

            {/* Terms */}
            <Text style={[styles.terms, { color: colors.muted }]}>
              By creating an account, you agree to our{" "}
              <Text style={{ color: colors.primary }}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={{ color: colors.primary }}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              Already have an account?{" "}
            </Text>
            <Link href="/auth/login" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
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
  signupButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
  },
  oauthContainer: {
    flexDirection: "row",
    gap: 12,
  },
  oauthButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  oauthButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  terms: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
