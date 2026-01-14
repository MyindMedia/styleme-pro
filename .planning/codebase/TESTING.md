# Testing

## Test Framework

**Framework:** Vitest 2.1.9
**Command:** `pnpm test` / `vitest run`

## Test File Structure

```
tests/
├── auth.logout.test.ts    # Auth logout procedure
├── supabase.test.ts       # Supabase connection
└── removebg.test.ts       # Remove.bg API
```

**Naming Convention:** `<feature>.<operation>.test.ts`

## Test Patterns

### Integration Test (Supabase Connection)
```typescript
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Supabase Connection", () => {
  it("should connect with valid credentials", async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const { error } = await supabase.from("_test").select("*").limit(1);

    expect(error?.message).not.toContain("Invalid API key");
  });
});
```

### Unit Test with Mocking (tRPC Procedure)
```typescript
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function createAuthContext() {
  const clearedCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: { id: 1, email: "test@example.com", ... },
    req: { protocol: "https", headers: {} },
    res: {
      clearCookie: (name, options) => {
        clearedCookies.push({ name, options });
      },
    },
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears session cookie", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});
```

## Mocking Patterns

### Manual Context Factory
```typescript
function createAuthContext() {
  const spyCalls: Call[] = [];

  return {
    ctx: {
      user: mockUser,
      res: {
        clearCookie: (...args) => spyCalls.push(args),
      },
    },
    spyCalls,
  };
}
```

### Environment Variables
Tests use `process.env` directly for integration tests.

## Current Coverage

| Area | Status |
|------|--------|
| Auth procedures | Partial (some skipped) |
| Supabase connection | Covered |
| Remove.bg API | Covered |
| UI Components | Not covered |
| E2E tests | Not implemented |

## Test Helpers

```typescript
// Type helpers
type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
```

## Recommended Patterns

### New Component Tests
```typescript
describe("ComponentName", () => {
  it("should render with default props", () => {
    // Setup
    // Render
    // Assert
  });

  it("should handle user interaction", () => {
    // Setup
    // Trigger
    // Verify
  });
});
```

### New API Tests
```typescript
describe("Utility.function", () => {
  it("should return expected result", async () => {
    const result = await functionUnderTest(data);
    expect(result).toMatchObject(expectedStructure);
  });
});
```

## Notes

- Tests use `.skip` for unimplemented features
- Focus on critical paths (auth, database)
- No UI component tests yet
- TypeScript strict mode in tests
