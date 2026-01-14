import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Load environment variables from .env.local for tests
config({ path: ".env.local" });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
