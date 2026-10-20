import { drizzle as xataHttp } from "drizzle-orm/xata-http";
import { drizzle as nodePostgres } from "drizzle-orm/node-postgres";
import { getXataClient } from "@/lib/db/xata";
import * as userSchema from "./schema/user";
import * as taskSchema from "./schema/task";
import * as eventSchema from "./schema/event";
import * as calendarSchema from "./schema/google-calendar";

function initDB() {
  const schema = { ...userSchema, ...taskSchema, ...eventSchema, ...calendarSchema };
  if (process.env.NODE_ENV === "development") {
    const dbDev = nodePostgres(process.env.DATABASE_URL!, { schema });
    return dbDev;
  } else {
    const xata = getXataClient();
    const dbProd = xataHttp(xata, { schema });
    return dbProd;
  }
}

export const db = initDB();
