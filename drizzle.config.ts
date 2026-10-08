import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
export default defineConfig({
  schema: "./src/lib/db/schema",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NODE_ENV === "production"
      ? process.env.XATA_PG_ENDPOINT!
      : process.env.DATABASE_URL!,
  },
});
