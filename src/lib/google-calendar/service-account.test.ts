import assert from "node:assert/strict";
import { createPublicKey, verify } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { env } from "@/env";
import { GOOGLE_CALENDAR_SCOPE } from "./config";
import { serviceAccountCredentials, serviceAccountToken } from "./service-account";

test("service account JWT has a valid RSA signature, narrow scope and no user impersonation", async (t) => {
  const credentials = await serviceAccountCredentials();
  const mock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(String(init?.body));
    assert.equal(body.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
    const [header, payload, signature] = body.get("assertion")!.split(".");
    assert.equal(JSON.parse(Buffer.from(header, "base64url").toString()).alg, "RS256");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    assert.equal(claims.iss, credentials.client_email);
    assert.equal(claims.scope, GOOGLE_CALENDAR_SCOPE);
    assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
    assert.equal(claims.exp - claims.iat, 3600);
    assert.equal("sub" in claims, false);
    assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), createPublicKey(credentials.key), Buffer.from(signature, "base64url")), true);
    return Response.json({ access_token: "service-test-token", expires_in: 3600 });
  });
  assert.equal(await serviceAccountToken(credentials), "service-test-token");
  assert.equal(await serviceAccountToken(credentials), "service-test-token");
  assert.equal(mock.mock.callCount(), 1);
});

test("invalid credentials and failed token exchange do not fall back to user authorization or retry", async (t) => {
  const file = env.GOOGLE_SERVICE_ACCOUNT_FILE!;
  const original = await readFile(file, "utf8");
  try {
    await writeFile(file, JSON.stringify({ ...JSON.parse(original), client_email: "denied@example.iam.gserviceaccount.com" }));
    const credentials = await serviceAccountCredentials();
    const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ error: "invalid_grant", error_description: "private-key-do-not-display" }, { status: 400 }));
    await assert.rejects(serviceAccountToken(credentials), /Check the service account credentials and server clock/);
    assert.equal(mock.mock.callCount(), 1);
    await writeFile(file, '{"type":"authorized_user"}');
    await assert.rejects(serviceAccountCredentials(), /Check the service account credentials file/);
  } finally { await writeFile(file, original); }
});
