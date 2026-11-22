import Pusher from "pusher";

/**
 * Server-side Pusher Channels client singleton.
 * Uses official pusher library. If credentials are not yet configured,
 * exports null to allow graceful fallback to HTTP polling.
 */
const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

export const pusherServer: Pusher | null =
  appId && key && secret
    ? new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      })
    : null;

export function isPusherConfigured(): boolean {
  return Boolean(pusherServer);
}
