import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
const isDev = process.env.NODE_ENV === "development";
console.log("isDev", isDev);
export default defineConfig({
  schema: "./src/lib/db/schema",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: isDev ? process.env.DATABASE_URL! : process.env.XATA_PG_ENDPOINT!,
  },
});
