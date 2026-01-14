import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      // User refused permissions
      return null;
    }
    // Get the token (for remote push) - though we are mostly using local for now
    // token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    // alert("Must use physical device for Push Notifications");
  }

  return token;
}

export async function scheduleDailyReminder(hour: number = 9, minute: number = 0) {
  // Cancel existing reminders to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule "Fit Check" reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Good morning! ☀️",
      body: "What are you wearing today? Log your outfit to keep your streak!",
      sound: true,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });

  // Save preference
  await AsyncStorage.setItem("notifications_enabled", "true");
  await AsyncStorage.setItem("notification_time", JSON.stringify({ hour, minute }));
}

export async function cancelNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem("notifications_enabled", "false");
}
