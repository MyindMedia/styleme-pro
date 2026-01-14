# Technical Concerns

## Critical Issues

### 1. Cloud Sync Not Implemented
**Files:** `lib/cloud-sync.ts` (Lines 128, 151)
```typescript
// TODO: Implement actual tRPC call when backend sync endpoint is ready
```
**Impact:** Cloud sync is non-functional. Data is not synchronized.
**Action:** Implement `sync.upload` and `sync.download` tRPC endpoints.

### 2. Database Schema Incomplete
**File:** `drizzle/schema.ts` (Line 28)
```typescript
// TODO: Add your tables here
```
**Impact:** Core tables (clothing_items, outfits, etc.) not in Drizzle schema.
**Action:** Add table definitions for all data models.

### 3. Auth Tests Skipped
**File:** `tests/auth.logout.test.ts` (Line 45)
```typescript
describe.skip("auth.logout", () => {
```
**Impact:** Logout functionality not tested.
**Action:** Complete auth implementation and enable test.

## Security Concerns

### Excessive Debug Logging (20+ files)
**High-risk files:**
- `lib/_core/auth.ts` - 9 console.log calls
- `lib/_core/api.ts` - 14 console.log calls
- `hooks/use-auth.ts` - 20+ console.log calls
- `app/oauth/callback.tsx` - 12 console.log calls

**Impact:** Production logs cluttered, potential info disclosure.
**Action:** Remove or use proper logging library.

### Unsafe Type Casting
**Files with `any` usage:**
- `app/oauth/callback.tsx` (Lines 11, 132, 147)
- `app/add-item.tsx` (Lines 200, 204, 274)
- `contexts/AuthContext.tsx` (Line 14)
- 13+ instances of `as any` across codebase

**Action:** Replace with proper types or Zod validation.

### Unsafe JSON Parsing
**Files:**
- `app/oauth/callback.tsx` (Line 15) - JWT without validation
- `server/routers.ts` (Multiple) - 6+ unsafe JSON.parse

**Action:** Add Zod schema validation.

### Token Security
**File:** `lib/_core/api.ts` (Line 110)
- Tokens logged (even truncated)

**Action:** Don't log tokens.

## Performance Concerns

### Web Scraping Retries
**File:** `server/routers.ts` (Lines 61-113)
- Multiple retry attempts with delays
- Can block 1-3 seconds per request

**Action:** Add timeouts, implement caching.

## Code Quality

### Error Handling Inconsistency
- Some functions return `null`
- Others return `{ success: false, error }`
- Some throw exceptions
- Some catch silently

**Action:** Standardize on Result pattern.

### Missing Error Messages
**File:** `lib/cloud-sync.ts` (Line 61)
```typescript
catch (error) {
  return { error: "Failed to get sync state" }; // Generic
}
```
**Action:** Preserve actual error details.

## Outdated Dependencies

```
@react-navigation/*    → minor updates available
@tanstack/react-query  5.90.12 → 5.90.16
@trpc/* packages       11.7.2 → 11.8.1
drizzle-orm            0.44.7 → 0.45.1
expo                   54.0.29 → 54.0.31
```

**Action:** Review and update packages.

## Known Unstable Areas

Git history shows repeated OAuth/Auth fixes:
```
6d88e2c - fix(oauth): use AsyncStorage and correct redirect URL
55d4846 - fix(oauth): handle session directly when setSession fails
0919cb1 - fix(auth,onboarding): fix OAuth session detection
...10+ more auth-related fixes
```

**Concerns:**
- Session management complexity
- Race conditions in redirect flow
- Cross-platform incompatibilities

## Environment Variables

**File:** `server/_core/env.ts`
```typescript
cookieSecret: process.env.JWT_SECRET ?? "",  // Empty if missing!
```
**Impact:** Silent failures at runtime.
**Action:** Validate env vars at startup.

## Priority Summary

| Category | Severity | Count |
|----------|----------|-------|
| TODO/FIXME | CRITICAL | 5 |
| Console.log | HIGH | 20+ files |
| Type `any` | HIGH | 13+ |
| Unsafe JSON | HIGH | 8+ |
| Outdated deps | MEDIUM | 19 |
| Error handling | MEDIUM | 5+ |

## Immediate Actions

1. Implement database schema
2. Implement cloud sync endpoints
3. Remove console.log statements
4. Validate JSON parsing
5. Fix OAuth session handling
