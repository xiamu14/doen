import { drizzle } from "drizzle-orm/xata-http";
import { getXataClient } from "@/lib/db/xata";
import { db as dbDev } from "./node-postgres";

function createDB() {
  if (process.env.NODE_ENV === "development") {
    return dbDev;
  } else {
    const xata = getXataClient();
    const dbProd = drizzle(xata);
    return dbProd;
  }
}

export const db = createDB();
