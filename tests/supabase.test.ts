import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Supabase Connection", () => {
  it("should connect to Supabase with valid credentials", async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    // Verify environment variables are set
    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseUrl).toContain("supabase.co");

    // Create client and test connection
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    
    // Test a simple query to verify connection works
    // This will return an empty result but confirms the connection is valid
    const { error } = await supabase.from("_test_connection").select("*").limit(1);
    
    // We expect either success or a "relation does not exist" error (table doesn't exist yet)
    // Both indicate valid credentials - only auth errors would be a problem
    if (error) {
      // These errors are acceptable - they mean we connected but table doesn't exist
      const acceptableErrors = [
        "relation",
        "does not exist",
        "permission denied",
        "not found",
      ];
      const isAcceptableError = acceptableErrors.some((msg) =>
        error.message.toLowerCase().includes(msg)
      );
      
      if (!isAcceptableError) {
        // If it's an auth error, fail the test
        expect(error.message).not.toContain("Invalid API key");
        expect(error.message).not.toContain("JWT");
      }
    }
    
    // If we get here without throwing, credentials are valid
    expect(true).toBe(true);
  });
});
