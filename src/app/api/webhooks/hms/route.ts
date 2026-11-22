import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyHMSWebhook } from "@/lib/hms";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-100ms-signature") || "";

    const isValid = await verifyHMSWebhook(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.id || payload.event_id || `hms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const eventType = payload.type || "unknown";

    // Deduplication via WebhookEvent table
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      return NextResponse.json({ received: true, note: "Already processed" }, { status: 200 });
    }

    // Record webhook event immediately
    await prisma.webhookEvent.create({
      data: {
        provider: "100ms",
        eventId,
        type: eventType,
        payload,
      },
    });

    // Process event asynchronously/fast
    const data = payload.data || {};
    const roomId = data.room_id;
    const sessionId = data.session_id;

    if (roomId) {
      if (eventType === "peer.join.success") {
        // Set startedAt if not set or record session ID
        await prisma.consultation.updateMany({
          where: { hmsRoomId: roomId, status: "ACTIVE" },
          data: {
            hmsSessionId: sessionId || undefined,
          },
        });
      } else if (eventType === "session.close.success") {
        // Find consultation
        const consultations = await prisma.consultation.findMany({
          where: { hmsRoomId: roomId, status: "ACTIVE" },
        });

        for (const c of consultations) {
          const endedAt = new Date();
          const durationSeconds = Math.max(
            0,
            Math.floor((endedAt.getTime() - new Date(c.startedAt).getTime()) / 1000)
          );

          await prisma.consultation.update({
            where: { id: c.id },
            data: {
              status: "COMPLETED",
              endedAt,
              durationSeconds,
              endReason: "HMS_SESSION_CLOSED",
              hmsSessionId: sessionId || c.hmsSessionId,
            },
          });
        }
      }
    }

    // Mark processed
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("100ms webhook processing error:", error);
    // Return 200/500 depending on state, 500 triggers retry
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
