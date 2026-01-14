---
objective: Build Advanced Closet Analytics Dashboard
---

<objective>
Visualize user style data to provide insights like "Most Worn", "Cost per Wear", "Favorite Colors", and "Wardrobe Value".
</objective>

<execution_context>
@app/analytics.tsx (create if missing)
@app/(tabs)/profile.tsx
@lib/analytics.ts (create if missing)
</execution_context>

<context>
Users collect data by adding items and logging wears. We need to visualize this to show value.
</context>

<tasks>
- [ ] Create `lib/analytics.ts`:
    - Helper functions to calculate stats from `clothingItems` and `wearLogs`.
    - `calculateCostPerWear(item)`
    - `getMostWornItems(limit)`
    - `getColorDistribution()`
- [ ] Create `app/analytics.tsx` (accessible from Profile):
    - **Charts**: Pie chart for Categories/Colors (using `react-native-chart-kit` or simple SVG).
    - **Stats Cards**: "Total Value", "Items Count", "Avg Cost/Wear".
    - **Insights**: "You wear Black 40% of the time."
</tasks>

<verification>
- [ ] Stats update correctly when new items/logs are added.
- [ ] Charts render without crashing.
</verification>

<success_criteria>
- Users gain actionable insights about their wardrobe.
- Justifies the "Pro" value proposition.
</success_criteria>
