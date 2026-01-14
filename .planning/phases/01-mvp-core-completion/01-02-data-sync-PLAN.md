---
objective: Implement Cloud Data Synchronization with Supabase
---

<objective>
Implement the `uploadToCloud` and `downloadFromCloud` functions in `lib/cloud-sync.ts` to synchronize local `AsyncStorage` data with Supabase tables (`clothing_items`, `outfits`, `wear_logs`, `wishlist_items`, `trips`).
</objective>

<execution_context>
@lib/cloud-sync.ts
@lib/storage.ts
@supabase/migrations/001_initial_schema.sql
</execution_context>

<context>
The app is local-first. We need a sync mechanism that:
1.  **Push**: Takes local data and upserts it to Supabase (using `id` as key).
2.  **Pull**: Fetches data from Supabase and updates local storage.
3.  **Conflict Resolution**: Last-write-wins (simple) or timestamp-based (using `updated_at`). For MVP, simple upsert is acceptable.
</context>

<tasks>
- [ ] Implement `uploadToCloud`:
    - Iterate through `clothingItems`, `outfits`, etc.
    - Use `supabase.from('table').upsert(data)` to batch save.
    - Handle image uploads: If `imageUri` is local (`file://`), upload to Supabase Storage `clothing-images` bucket and update `image_uri` with public URL.
- [ ] Implement `downloadFromCloud`:
    - `supabase.from('table').select('*')` for all entities.
    - Update local `AsyncStorage` with fetched data.
- [ ] Add `performFullSync` trigger on app launch (if online) and on pull-to-refresh in Home screen.
- [ ] Add manual "Sync Now" button in Profile settings.
</tasks>

<verification>
- [ ] Add an item offline, then go online and sync -> Item appears in Supabase table.
- [ ] Change item on another device (simulate by editing Supabase row), sync -> Item updates locally.
- [ ] Images upload correctly to Storage bucket.
</verification>

<success_criteria>
- Data persists across devices for the same user.
- Local changes are not lost.
- Images are backed up to cloud storage.
</success_criteria>
