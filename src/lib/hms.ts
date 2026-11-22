/**
 * src/lib/hms.ts
 * 100ms (hms.live) server-side utilities:
 *   - generateManagementToken()  — HS256 JWT for management API calls
 *   - generateAppToken()         — HS256 JWT for client SDK room join
 *   - createHMSRoom()            — creates a room via REST API
 *   - endHMSRoom()               — ends all active sessions in a room
 */

import { SignJWT } from "jose";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getHMSConfig() {
  const accessKey = process.env.HMS_APP_ACCESS_KEY;
  const appSecret = process.env.HMS_APP_SECRET;
  const templateId = process.env.HMS_TEMPLATE_ID;

  if (!accessKey || !appSecret || !templateId) {
    throw new Error(
      "CRITICAL: HMS_APP_ACCESS_KEY, HMS_APP_SECRET and HMS_TEMPLATE_ID must be set. " +
        "Create a 100ms account at https://dashboard.100ms.live, create a template with " +
        "roles 'host' and 'guest', then copy the credentials to your .env.local file."
    );
  }

  return { accessKey, appSecret, templateId };
}

// ---------------------------------------------------------------------------
// Management Token (used for server-to-server API calls)
// ---------------------------------------------------------------------------

async function generateManagementToken(): Promise<string> {
  const { accessKey, appSecret } = getHMSConfig();

  const secretKey = new TextEncoder().encode(appSecret);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    access_key: accessKey,
    type: "management",
    version: 2,
    jti: uuidv4(),
    iat: now,
    nbf: now,
    exp: now + 24 * 3600, // 24 hours
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secretKey);
}

// ---------------------------------------------------------------------------
// App Token (used by client SDK to join a room)
// ---------------------------------------------------------------------------

export async function generateAppToken(
  roomId: string,
  userId: string,
  role: "host" | "guest"
): Promise<string> {
  const { accessKey, appSecret } = getHMSConfig();

  const secretKey = new TextEncoder().encode(appSecret);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    access_key: accessKey,
    room_id: roomId,
    user_id: userId,
    role,
    type: "app",
    version: 2,
    jti: uuidv4(),
    iat: now,
    nbf: now,
    exp: now + 2 * 3600, // 2 hours
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secretKey);
}

// ---------------------------------------------------------------------------
// Create Room
// ---------------------------------------------------------------------------

export interface HMSRoom {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
}

export async function createHMSRoom(name: string): Promise<HMSRoom> {
  const { templateId } = getHMSConfig();
  const managementToken = await generateManagementToken();

  const response = await fetch("https://api.100ms.live/v2/rooms", {
    method: "POST",
    headers: {
      Authorization: `Management ${managementToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description: "MindHaven consultation room",
      template_id: templateId,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `100ms createRoom failed (${response.status}): ${errorBody}`
    );
  }

  return response.json() as Promise<HMSRoom>;
}

// ---------------------------------------------------------------------------
// End Room (disable room + end all active sessions)
// ---------------------------------------------------------------------------

export async function endHMSRoom(hmsRoomId: string, reason: string): Promise<void> {
  const managementToken = await generateManagementToken();

  // End all active sessions
  const sessionsRes = await fetch(
    `https://api.100ms.live/v2/active-rooms/${hmsRoomId}/end-room`,
    {
      method: "POST",
      headers: {
        Authorization: `Management ${managementToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lock: false, reason }),
    }
  );

  // 404 means no active session — that's fine
  if (!sessionsRes.ok && sessionsRes.status !== 404) {
    const errorBody = await sessionsRes.text();
    console.error(
      `100ms endRoom (${hmsRoomId}) failed (${sessionsRes.status}): ${errorBody}`
    );
    // Don't throw — consultation can still be marked ended in our DB
  }
}

// ---------------------------------------------------------------------------
// Verify webhook signature
// ---------------------------------------------------------------------------

/**
 * Verify that an incoming 100ms webhook request is authentic.
 * 100ms sends a HMAC-SHA256 signature in the `x-100ms-signature` header.
 * https://www.100ms.live/docs/server-side/v2/how--to-guides/configure-webhooks/webhook#signature
 */
export async function verifyHMSWebhook(
  body: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.HMS_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("HMS_WEBHOOK_SECRET not set — skipping webhook signature verification");
    return true; // Fail open only in dev; set the secret in production
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // 100ms sends hex-encoded signature
  const sigBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );

  return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(body));
}
