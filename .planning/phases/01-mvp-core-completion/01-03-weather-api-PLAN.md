---
objective: Integrate Weather API for Outfit Recommendations
---

<objective>
Implement weather fetching using OpenMeteo (free, no key) or similar API, and update `server/routers.ts` (or client-side logic) to factor weather into outfit suggestions.
</objective>

<execution_context>
@server/routers.ts
@app/(tabs)/style.tsx
@app/weather-outfit.tsx
</execution_context>

<context>
The `weather.getOutfitRecommendation` procedure in `server/routers.ts` already exists but might be mocked or using a placeholder. We need to ensure it fetches real data based on user location.
</context>

<tasks>
- [ ] Check `server/routers.ts` for `weather` router implementation.
- [ ] Ensure `getOutfitRecommendation` calls OpenMeteo API with correct lat/long.
- [ ] Verify the LLM prompt for weather outfit generation includes temperature, condition, and user's specific closet items.
- [ ] In `app/weather-outfit.tsx`, ensure it requests location permission and passes coords to the API.
</tasks>

<verification>
- [ ] `weather.getOutfitRecommendation` returns valid weather data for current location.
- [ ] Outfit suggestions are appropriate for the weather (e.g., "Wear a jacket" if cold).
</verification>

<success_criteria>
- Users get accurate weather info.
- Outfit recommendations adapt to temperature and conditions.
</success_criteria>
