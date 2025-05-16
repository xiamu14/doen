import { drizzle } from "drizzle-orm/xata-http";
import { getXataClient } from "./xata";
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

const db = createDB();
