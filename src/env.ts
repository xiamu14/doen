import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // BetterAuth
    BETTER_AUTH_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    // Database
    DATABASE_URL: z.string().min(1),
    // Github
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    // Google
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
});
