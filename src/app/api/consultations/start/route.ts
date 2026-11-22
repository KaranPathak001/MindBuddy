import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createHMSRoom, generateAppToken } from "@/lib/hms";
import { pusherServer } from "@/lib/pusher-server";

const startSchema = z.object({
  expertProfileId: z.string().min(1, "Expert profile ID is required"),
  type: z.enum(["FIVE_MIN_FREE", "PAID"]).optional().default("PAID"),
  appointmentId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: "Your account is suspended. Please contact support." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { expertProfileId, type, appointmentId } = parsed.data;
    const isFreeTrial = type === "FIVE_MIN_FREE";

    // Prevent self-consultation
    const expert = await prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
      select: { id: true, userId: true, fullName: true, verificationStatus: true },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    if (expert.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot start a consultation with yourself" },
        { status: 400 }
      );
    }

    if (expert.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "This expert is not yet verified and cannot accept consultations" },
        { status: 403 }
      );
    }

    // Free trial eligibility check
    if (isFreeTrial) {
      const usage = await prisma.consultationUsage.findUnique({
        where: { userId: user.id },
      });

      if (usage?.hasUsedFreeTrial) {
        return NextResponse.json(
          {
            error:
              "You have already used your one-time 5-minute complimentary consultation. Please choose a paid package.",
            code: "TRIAL_ALREADY_USED",
          },
          { status: 403 }
        );
      }
    }

    // If appointment-based, verify the appointment belongs to this user + expert
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { userId: true, expertProfileId: true, status: true },
      });

      if (!appointment || appointment.userId !== user.id) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      if (appointment.expertProfileId !== expertProfileId) {
        return NextResponse.json({ error: "Appointment expert mismatch" }, { status: 400 });
      }

      if (appointment.status !== "CONFIRMED") {
        return NextResponse.json(
          { error: "Appointment is not confirmed" },
          { status: 400 }
        );
      }
    }

    const maxAllowedSecs = isFreeTrial ? 300 : 1800;

    // Create a real 100ms room
    const roomName = `mh-${user.id.slice(-6)}-${expertProfileId.slice(-6)}-${Date.now().toString(36)}`;
    const hmsRoom = await createHMSRoom(roomName);

    // Generate app token for user (guest role)
    const clientToken = await generateAppToken(hmsRoom.id, user.id, "guest");

    // Persist consultation in a transaction
    const consultation = await prisma.$transaction(async (tx) => {
      if (isFreeTrial) {
        await tx.consultationUsage.upsert({
          where: { userId: user.id },
          update: { hasUsedFreeTrial: true, usedAt: new Date() },
          create: {
            userId: user.id,
            hasUsedFreeTrial: true,
            usedAt: new Date(),
          },
        });
      }

      const cons = await tx.consultation.create({
        data: {
          userId: user.id,
          expertProfileId,
          appointmentId: appointmentId ?? null,
          type: isFreeTrial ? "FIVE_MIN_FREE" : "PAID",
          status: "ACTIVE",
          roomId: roomName,
          hmsRoomId: hmsRoom.id,
          maxAllowedSecs,
        },
      });

      // Notify the expert of the incoming call
      await tx.notification.create({
        data: {
          userId: expert.userId,
          type: "CALL",
          title: "Incoming Consultation Request",
          message: `A patient is waiting in your consultation room.`,
          link: `/expert/dashboard?call=${cons.id}`,
        },
      });

      return cons;
    });

    // Push real-time notification to expert via Pusher
    if (pusherServer) {
      await pusherServer
        .trigger(`private-user-${expert.userId}`, "incoming-call", {
          consultationId: consultation.id,
          hmsRoomId: hmsRoom.id,
          patientName: "Anonymous Patient",
          type,
        })
        .catch((err: unknown) =>
          console.error("Pusher trigger failed:", err)
        );
    }

    return NextResponse.json({
      success: true,
      consultationId: consultation.id,
      roomId: hmsRoom.id,
      token: clientToken,
      maxAllowedSecs,
      startedAt: consultation.startedAt,
      isFreeTrial,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start consultation";
    console.error("Consultation Start Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
