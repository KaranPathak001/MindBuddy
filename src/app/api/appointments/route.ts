import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bookAppointmentSchema = z.object({
  expertProfileId: z.string().min(1, "Expert ID is required"),
  scheduledAt: z.string().datetime("Must be a valid ISO date-time string"),
  durationMinutes: z.number().int().min(15).max(60).default(30),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: "Your account is currently suspended." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = bookAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid booking details" },
        { status: 400 }
      );
    }

    const { expertProfileId, scheduledAt, durationMinutes, notes } = validation.data;
    const targetDate = new Date(scheduledAt);
    const now = Date.now();

    // Must be at least 15 minutes ahead
    if (targetDate.getTime() < now + 15 * 60 * 1000) {
      return NextResponse.json(
        { error: "Appointments must be scheduled at least 15 minutes in advance." },
        { status: 400 }
      );
    }

    // Maximum 30 days ahead
    if (targetDate.getTime() > now + 30 * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Appointments cannot be booked more than 30 days in advance." },
        { status: 400 }
      );
    }

    // Check expert exists & is approved
    const expert = await prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    if (expert.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot schedule an appointment with yourself." },
        { status: 400 }
      );
    }

    if (expert.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "This practitioner is not yet approved for appointments." },
        { status: 403 }
      );
    }

    // Double-booking check inside a Prisma transaction
    const newAppointment = await prisma.$transaction(async (tx) => {
      const conflictStart = new Date(targetDate.getTime() - durationMinutes * 60 * 1000);
      const conflictEnd = new Date(targetDate.getTime() + durationMinutes * 60 * 1000);

      const conflict = await tx.appointment.findFirst({
        where: {
          expertProfileId,
          status: { in: ["PENDING", "CONFIRMED"] },
          scheduledAt: {
            gt: conflictStart,
            lt: conflictEnd,
          },
        },
      });

      if (conflict) {
        throw new Error("SLOT_ALREADY_BOOKED");
      }

      const meetingRoomId = `mh-meet-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const created = await tx.appointment.create({
        data: {
          userId: user.id,
          expertProfileId,
          scheduledAt: targetDate,
          durationMinutes,
          notes: notes || null,
          meetingRoomId,
          status: "CONFIRMED",
        },
        include: {
          expert: {
            select: { fullName: true, type: true, collegeOrHospital: true },
          },
        },
      });

      // Create notification for expert
      await tx.notification.create({
        data: {
          userId: expert.userId,
          type: "APPOINTMENT",
          title: "New Appointment Booked",
          message: `A patient has booked a session on ${targetDate.toLocaleDateString("en-IN")}.`,
          link: `/expert/dashboard`,
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      appointment: newAppointment,
      message: "Appointment confirmed.",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "SLOT_ALREADY_BOOKED") {
      return NextResponse.json(
        { error: "This time slot was just booked by another user. Please choose another." },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to book appointment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const appointments = await prisma.appointment.findMany({
      where: { userId: user.id },
      orderBy: { scheduledAt: "asc" },
      include: {
        expert: {
          select: {
            id: true,
            fullName: true,
            type: true,
            avatarUrl: true,
            qualifications: true,
            consultationPrice: true,
          },
        },
      },
    });

    return NextResponse.json({ appointments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load appointments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
