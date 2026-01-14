---
objective: Integrate Automatic Background Removal for Clothing Items
---

<objective>
Implement automatic background removal for clothing item images using the Remove.bg API (or a similar service/library if key is missing). Ensure clean, professional-looking closet items.
</objective>

<execution_context>
@server/routers.ts
@app/add-item.tsx
@server/_core/env.ts
</execution_context>

<context>
The `imageProcessing.removeBackground` procedure already exists in `server/routers.ts` but relies on `ENV.removeBgApiKey`. We need to:
1.  Verify the API key is configured or provide a fallback/mock for development.
2.  Add a "Remove Background" toggle or auto-process step in `app/add-item.tsx`.
3.  Store the processed image (transparent PNG) instead of the raw photo.
</context>

<tasks>
- [ ] Check `server/_core/env.ts` for `REMOVE_BG_API_KEY`.
- [ ] Update `app/add-item.tsx`:
    - Add a "Remove Background" switch (default: true).
    - Call `imageProcessing.removeBackground` after capturing/selecting an image.
    - Show a loading state while processing.
    - Allow user to toggle between original and processed image in review step.
- [ ] Handle API errors gracefully (e.g., quota exceeded) by falling back to original image.
</tasks>

<verification>
- [ ] Upload an image -> Background is removed automatically.
- [ ] Item saved with transparent background.
- [ ] Fallback works if API fails.
</verification>

<success_criteria>
- Users can save items with clean, transparent backgrounds.
- Closet view looks more consistent and professional.
</success_criteria>
