import { describe, it, expect } from "vitest";

describe("Remove.bg API", () => {
  it("should validate API key with account info endpoint", async () => {
    const apiKey = process.env.REMOVE_BG_API_KEY;

    // Skip test if API key is not set (CI environment)
    if (!apiKey || apiKey.length < 10) {
      console.log("Skipping Remove.bg test: API key not set");
      return;
    }
    
    // Validate API key by checking account info (free endpoint)
    const response = await fetch("https://api.remove.bg/v1.0/account", {
      headers: {
        "X-Api-Key": apiKey!,
      },
    });
    
    // API key should be valid (200) or have usage limits (402)
    // 401 means invalid key
    expect(response.status).not.toBe(401);
    
    if (response.ok) {
      const data = await response.json();
      console.log("Remove.bg account info:", {
        credits: data.data?.attributes?.credits,
        freeApiCalls: data.data?.attributes?.api?.free_calls,
      });
      expect(data.data).toBeDefined();
    }
  });
});
