import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { env } from "@/env";
import { GOOGLE_CALENDAR_SCOPE } from "./config";
import { CalendarSyncError } from "./errors";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const credentialsSchema = z.object({ type: z.literal("service_account"), client_email: z.string().email(), private_key: z.string().min(1) });
let cached: { identity: string; token: string; expiresAt: number } | undefined;

export function serviceAccountConfigured() {
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_FILE && env.GOOGLE_CALENDAR_ID);
}

export async function serviceAccountCredentials() {
  if (!serviceAccountConfigured()) throw new CalendarSyncError("Configure the service account and Calendar ID.");
  try {
    const value = credentialsSchema.parse(JSON.parse(await readFile(env.GOOGLE_SERVICE_ACCOUNT_FILE!, "utf8")));
    const key = createPrivateKey(value.private_key);
    if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error("Invalid signing key");
    return { ...value, key, calendarId: env.GOOGLE_CALENDAR_ID! };
  } catch {
    throw new CalendarSyncError("Check the service account credentials file.");
  }
}

export async function serviceAccountToken(credentials: Awaited<ReturnType<typeof serviceAccountCredentials>>) {
  const identity = createHash("sha256").update(credentials.client_email).update(credentials.private_key).digest("hex");
  if (cached?.identity === identity && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: credentials.client_email, scope: GOOGLE_CALENDAR_SCOPE,
    aud: TOKEN_URL, iat: issuedAt, exp: issuedAt + 3600,
  })).toString("base64url");
  const input = `${header}.${payload}`;
  const assertion = `${input}.${sign("RSA-SHA256", Buffer.from(input), credentials.key).toString("base64url")}`;
  const response = await fetch(TOKEN_URL, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new CalendarSyncError("Check the service account credentials and server clock.");
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (typeof token.access_token !== "string" || !token.access_token || typeof token.expires_in !== "number" || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
    throw new CalendarSyncError("Google returned an invalid service account token.");
  }
  cached = { identity, token: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return cached.token;
}
