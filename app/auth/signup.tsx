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
import { Image as ExpoImage } from "expo-image";

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
    <ScreenContainer 
      edges={["top", "left", "right", "bottom"]}
      style={{ backgroundColor: colors.background }} // Ensure background matches theme
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
             <View style={styles.topShapes}>
               {/* Abstract shapes simulation */}
               <View style={[styles.circleShape, { backgroundColor: colors.border, opacity: 0.3 }]} />
             </View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>START YOUR ADVENTURE</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.background, 
                    borderColor: colors.border,
                    color: colors.foreground 
                  }
                ]}
                placeholder="Type something here..."
                placeholderTextColor={colors.muted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.background, 
                    borderColor: colors.border,
                    color: colors.foreground 
                  }
                ]}
                placeholder="Type something here..."
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.background, 
                    borderColor: colors.border,
                    color: colors.foreground 
                  }
                ]}
                placeholder="Type something here..."
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <MaterialIcons
                  name={showPassword ? "visibility-off" : "visibility"}
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            {/* Confirm Password Input */}
            {/* <View style={styles.inputContainer}>
               // Removed Confirm Password to match design minimalism if desired, 
               // but keeping it for functionality is better. Design shows 3 inputs.
               // Name, Email, Password. 
            </View> */}
            {/* Design shows only 3 inputs. I will keep confirm password but style it same */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.background, 
                    borderColor: colors.border,
                    color: colors.foreground 
                  }
                ]}
                placeholder="Type something here..."
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
            </View>

            <Link href="/auth/forgot-password" asChild>
               <Pressable style={styles.forgotPassword}>
                 <Text style={[styles.forgotPasswordText, { color: colors.muted, fontFamily: 'PlayfairDisplay_400Regular' }]}>
                   Forgot Password?
                 </Text>
               </Pressable>
             </Link>

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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.signupButtonText, { color: "#fff", fontFamily: 'PlayfairDisplay_600SemiBold' }]}>
                  Create Account
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <Text style={[styles.dividerText, { color: colors.muted, fontFamily: 'PlayfairDisplay_400Regular' }]}>Or with</Text>
            </View>

            {/* OAuth Buttons */}
            <View style={styles.oauthContainer}>
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => handleOAuthSignup("apple")}
                  style={[styles.oauthButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.oauthButtonText, { color: colors.muted, fontFamily: 'PlayfairDisplay_500Medium' }]}>Apple</Text>
                </Pressable>
              )}
              
              <Pressable
                onPress={() => handleOAuthSignup("google")}
                style={[styles.oauthButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.oauthButtonText, { color: colors.muted, fontFamily: 'PlayfairDisplay_500Medium' }]}>Google</Text>
              </Pressable>
            </View>

          </View>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              Already have account?{" "}
            </Text>
            <Link href="/auth/login" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: colors.foreground, fontFamily: 'PlayfairDisplay_400Regular' }]}>Login</Text>
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
    marginBottom: 40,
    marginTop: 40,
  },
  topShapes: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: -1,
  },
  circleShape: {
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 1,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 14,
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 15,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 12,
  },
  signupButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  signupButtonText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  divider: {
    alignItems: "center",
    marginVertical: 20,
  },
  dividerText: {
    fontSize: 14,
  },
  oauthContainer: {
    flexDirection: "row",
    gap: 16,
    justifyContent: 'center',
  },
  oauthButton: {
    width: 120,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  oauthButtonText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
