import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime("Must be a valid ISO date-time string"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: appointmentId } = await params;
    const body = await request.json();
    const parsed = rescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid date" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { expert: { select: { userId: true, fullName: true } } },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.userId !== user.id && appointment.expert.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Cancellation/reschedule allowed only up to 2 hours before existing appointment
    const existingTime = new Date(appointment.scheduledAt).getTime();
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (existingTime - now < twoHoursMs) {
      return NextResponse.json(
        { error: "Appointments can only be rescheduled up to 2 hours before the scheduled time." },
        { status: 400 }
      );
    }

    const newTargetDate = new Date(parsed.data.scheduledAt);
    if (newTargetDate.getTime() < now + 15 * 60 * 1000) {
      return NextResponse.json(
        { error: "New time slot must be at least 15 minutes in advance." },
        { status: 400 }
      );
    }

    // Check conflict
    const conflict = await prisma.appointment.findFirst({
      where: {
        expertProfileId: appointment.expertProfileId,
        id: { not: appointmentId },
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: {
          gt: new Date(newTargetDate.getTime() - appointment.durationMinutes * 60 * 1000),
          lt: new Date(newTargetDate.getTime() + appointment.durationMinutes * 60 * 1000),
        },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Requested time slot is already booked." },
        { status: 409 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAt: newTargetDate,
        status: "RESCHEDULED",
      },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reschedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: appointmentId } = await params;
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        expert: { select: { userId: true } },
        payment: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.userId !== user.id && appointment.expert.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const existingTime = new Date(appointment.scheduledAt).getTime();
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (existingTime - now < twoHoursMs) {
      return NextResponse.json(
        { error: "Appointments can only be cancelled at least 2 hours in advance." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Mark cancelled
      const appt = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" },
      });

      // If associated payment was SUCCESS, mark for refund
      if (appointment.payment && appointment.payment.status === "SUCCESS") {
        await tx.payment.update({
          where: { id: appointment.payment.id },
          data: { status: "REFUNDED" },
        });
      }

      return appt;
    });

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully.",
      appointment: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to cancel appointment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
