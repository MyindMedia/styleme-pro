---
objective: Implement Premium Subscription UI (Monetization)
---

<objective>
Create the "Pro" upgrade experience, locking certain features behind a paywall (simulated for MVP) to demonstrate monetization potential.
</objective>

<execution_context>
@app/paywall.tsx (create)
@contexts/AuthContext.tsx
@app/(tabs)/profile.tsx
</execution_context>

<context>
We need to clearly differentiate Free vs. Pro tiers.
- **Free**: Limit closet items (e.g., 50), basic stats.
- **Pro**: Unlimited items, advanced analytics, background removal.
</context>

<tasks>
- [ ] Create `app/paywall.tsx`:
    - Attractive sales page listing Pro benefits.
    - "Subscribe" buttons (Monthly/Yearly).
- [ ] Update `AuthContext` to include `isPro` status (mocked).
- [ ] Add feature gates:
    - `add-item.tsx`: Check item count limit.
    - `analytics.tsx`: Blur advanced stats or show teaser.
    - `background-removal`: Make Pro-only.
- [ ] Implement "Restore Purchases" (UI only).
</tasks>

<verification>
- [ ] Trying to exceed limits triggers Paywall.
- [ ] "Subscribing" unlocks features immediately.
</verification>

<success_criteria>
- Clear value proposition for Pro.
- Paywall is intrusive enough to convert but not annoying.
</success_criteria>
