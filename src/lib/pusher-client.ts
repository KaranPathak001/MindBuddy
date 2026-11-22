import PusherClient from "pusher-js";

let clientInstance: PusherClient | null = null;
let loggedWarning = false;

/**
 * Returns the client-side Pusher instance connected to channel auth endpoint.
 * If credentials are missing, logs a single warning and returns null for 3-second polling fallback.
 */
export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

  if (!key) {
    if (!loggedWarning) {
      console.warn(
        "Pusher credentials (NEXT_PUBLIC_PUSHER_KEY) not set: falling back to 3-second live polling."
      );
      loggedWarning = true;
    }
    return null;
  }

  if (!clientInstance) {
    clientInstance = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }

  return clientInstance;
}
