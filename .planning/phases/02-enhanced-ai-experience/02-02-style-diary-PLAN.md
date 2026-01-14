---
objective: Implement Outfit Selfie Capture & Style Diary
---

<objective>
Create a feature for users to log their daily outfits by taking a selfie ("Fit Check"). This should integrate with the `wear_logs` table and allow tagging items from the closet.
</objective>

<execution_context>
@app/selfie-capture.tsx (create if missing)
@app/(tabs)/tracker.tsx
@lib/storage.ts
</execution_context>

<context>
The "Fit Tracker" currently exists as a tab but might be basic. We want to enhance it:
1.  **Capture**: Specialized camera screen for full-body selfies.
2.  **Tagging**: Tap to tag items worn (from closet).
3.  **Logging**: Save to `wear_logs` with date, photo, and items.
4.  **Diary**: View calendar/list of past outfits.
</context>

<tasks>
- [ ] Create `app/selfie-capture.tsx`:
    - Camera view with "Fit Check" overlay.
    - Timer option (3s, 10s) for hands-free shots.
- [ ] After capture, show "Tag Items" screen:
    - List closet items to multi-select.
    - AI suggestion: "I see a black t-shirt, is it this one?" (Optional/Bonus).
- [ ] Update `app/(tabs)/tracker.tsx`:
    - Display calendar view of logged outfits.
    - Show "OOTD" (Outfit of the Day) photos.
</tasks>

<verification>
- [ ] Take a photo -> Tag items -> Save.
- [ ] Appears in Tracker/Calendar.
- [ ] Wear count of tagged items increments.
</verification>

<success_criteria>
- Users can easily log what they wore.
- "Cost per wear" data becomes accurate over time.
</success_criteria>
