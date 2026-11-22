import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { endHMSRoom } from "@/lib/hms";

const heartbeatSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID required"),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { consultationId } = parsed.data;

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { expert: { select: { userId: true } } },
    });

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const isPatient = consultation.userId === user.id;
    const isExpert = consultation.expert.userId === user.id;
    if (!isPatient && !isExpert) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (consultation.status !== "ACTIVE") {
      return NextResponse.json({
        active: false,
        expired: true,
        remainingSecs: 0,
        status: consultation.status,
      });
    }

    // Server time calculation
    const now = Date.now();
    const startedTime = new Date(consultation.startedAt).getTime();
    const elapsedSecs = Math.max(0, Math.floor((now - startedTime) / 1000));
    const remainingSecs = Math.max(0, consultation.maxAllowedSecs - elapsedSecs);
    const expired = remainingSecs <= 0;

    // Auto-end server side if trial and expired
    if (expired && consultation.type === "FIVE_MIN_FREE") {
      await prisma.consultation.update({
        where: { id: consultationId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          durationSeconds: elapsedSecs,
          endReason: "FREE_TRIAL_LIMIT_REACHED",
        },
      });

      if (consultation.hmsRoomId) {
        await endHMSRoom(consultation.hmsRoomId, "Free trial duration reached (5 mins)").catch(
          (err) => console.error("Error auto-ending 100ms room:", err)
        );
      }
    }

    return NextResponse.json({
      active: !expired,
      elapsedSecs,
      remainingSecs,
      expired,
      type: consultation.type,
      maxAllowedSecs: consultation.maxAllowedSecs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Heartbeat failed";
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
