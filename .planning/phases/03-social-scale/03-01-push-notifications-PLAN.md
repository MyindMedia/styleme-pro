---
objective: Implement Push Notifications for Engagement
---

<objective>
Enable local push notifications to remind users to log their outfits and alert them about weather-appropriate styling.
</objective>

<execution_context>
@app/(tabs)/profile.tsx
@lib/notifications.ts (create)
@app/_layout.tsx
</execution_context>

<context>
Retention relies on daily engagement. We want to:
1.  **Daily Reminder**: "What are you wearing today?" (Morning).
2.  **Weather Alert**: "It's rainy today, don't forget your umbrella!" (Morning, if weather API allows).
3.  **Streak Protection**: "You're on a 5-day streak! Log now to keep it." (Evening).
</context>

<tasks>
- [ ] Install `expo-notifications`.
- [ ] Create `lib/notifications.ts`:
    - `registerForPushNotificationsAsync()`: Handle permissions.
    - `scheduleDailyReminder(hour, minute)`: Schedule recurring local notification.
- [ ] Update `app/_layout.tsx` to initialize notifications listener.
- [ ] Update `app/(tabs)/profile.tsx` to toggle notifications on/off and set time preference.
</tasks>

<verification>
- [ ] App requests permission on startup (or when enabled in settings).
- [ ] "Test Notification" button triggers an immediate alert.
- [ ] Recurring notification is scheduled.
</verification>

<success_criteria>
- Users can enable/disable notifications.
- System handles permissions gracefully.
</success_criteria>
