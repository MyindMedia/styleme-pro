---
objective: Enable Social Sharing to Instagram/TikTok
---

<objective>
Allow users to share their "Fit Check" or "Outfit Collage" directly to Instagram Stories or other social platforms with branded templates.
</objective>

<execution_context>
@app/share-modal.tsx (create)
@components/outfit-card.tsx
@lib/sharing.ts
</execution_context>

<context>
Viral growth comes from users sharing their looks. We need a "Share" flow that generates a beautiful image (collage + watermark) and opens the native share sheet or deep-links to Instagram Stories.
</context>

<tasks>
- [ ] Create `components/share-template.tsx`:
    - A hidden view that renders the outfit/collage with branding, date, and "FitCheck" logo.
    - Uses `react-native-view-shot` to capture as an image.
- [ ] Implement `shareToInstagramStories(imageUri)` in `lib/sharing.ts`:
    - Use `Linking` scheme `instagram-stories://share`.
- [ ] Update `app/(tabs)/tracker.tsx` and `app/selfie-capture.tsx`:
    - Add "Share to Story" button.
</tasks>

<verification>
- [ ] Tapping "Share" generates a branded image.
- [ ] Opens system share sheet (or Instagram if installed).
</verification>

<success_criteria>
- Shared images look professional and branded.
- Frictionless sharing flow.
</success_criteria>
