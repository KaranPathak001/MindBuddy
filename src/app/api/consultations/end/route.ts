import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { endHMSRoom } from "@/lib/hms";
import { pusherServer } from "@/lib/pusher-server";

const endSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID required"),
  notes: z.string().optional(),
  endReason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = endSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { consultationId, notes, endReason } = parsed.data;

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        expert: { select: { userId: true } },
      },
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
        success: true,
        message: "Consultation is already completed or ended.",
      });
    }

    const endedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - new Date(consultation.startedAt).getTime()) / 1000)
    );

    const finalEndReason = endReason || (isPatient ? "ENDED_BY_PATIENT" : "ENDED_BY_EXPERT");

    const updated = await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: isPatient ? "TERMINATED_BY_USER" : "COMPLETED",
        endedAt,
        durationSeconds,
        endReason: finalEndReason,
        notes: notes ?? undefined,
      },
    });

    // End active room in 100ms if hmsRoomId is present
    if (consultation.hmsRoomId) {
      await endHMSRoom(consultation.hmsRoomId, finalEndReason).catch((err) => {
        console.error("Failed to close 100ms room:", err);
      });
    }

    // Notify the other party via Pusher
    const targetUserId = isPatient ? consultation.expert.userId : consultation.userId;
    if (pusherServer) {
      await pusherServer
        .trigger(`private-user-${targetUserId}`, "consultation-ended", {
          consultationId,
          endReason: finalEndReason,
          durationSeconds,
        })
        .catch((err: unknown) => console.error("Pusher end event failed:", err));
    }

    return NextResponse.json({
      success: true,
      consultation: {
        id: updated.id,
        status: updated.status,
        durationSeconds: updated.durationSeconds,
        endedAt: updated.endedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to end consultation";
    console.error("End consultation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
