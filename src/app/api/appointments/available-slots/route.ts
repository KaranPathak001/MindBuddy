import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const slotsQuerySchema = z.object({
  expertProfileId: z.string().min(1, "Expert ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  timezoneOffsetMinutes: z.coerce.number().optional().default(0), // client timezone offset e.g. -330 for IST
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = slotsQuerySchema.safeParse({
      expertProfileId: searchParams.get("expertProfileId"),
      date: searchParams.get("date"),
      timezoneOffsetMinutes: searchParams.get("timezoneOffsetMinutes") ?? "0",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { expertProfileId, date, timezoneOffsetMinutes } = parsed.data;

    const expert = await prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
      include: {
        availabilities: { where: { isActive: true } },
      },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    // Determine Day of Week for selected date in user's perspective
    // e.g., "2026-11-20"
    const [year, month, day] = date.split("-").map(Number);
    const localDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = localDate.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

    // Match availabilities for this day of week
    const matchingAvailabilities = expert.availabilities.filter(
      (a) => a.dayOfWeek === dayOfWeek
    );

    // If expert has no specific schedule configured, provide standard clinical hours (10:00 - 18:00)
    const schedules =
      matchingAvailabilities.length > 0
        ? matchingAvailabilities
        : [
            {
              startTime: "10:00",
              endTime: "18:00",
              slotDuration: 30,
            },
          ];

    // Fetch existing appointments on this date range (start of day to end of day in UTC)
    // Account for client timezone: startOfDayUTC = UTC(year, month-1, day, 0, 0) + offset
    const dayStartUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) + timezoneOffsetMinutes * 60 * 1000);
    const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        expertProfileId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: {
          gte: dayStartUtc,
          lt: dayEndUtc,
        },
      },
      select: { scheduledAt: true, durationMinutes: true },
    });

    const bookedIntervals = existingAppointments.map((apt) => {
      const start = new Date(apt.scheduledAt).getTime();
      const end = start + apt.durationMinutes * 60 * 1000;
      return { start, end };
    });

    // Generate valid slots
    const availableSlots: { time: string; scheduledAtUtc: string }[] = [];
    const now = Date.now();

    for (const sched of schedules) {
      const [startHour, startMinute] = sched.startTime.split(":").map(Number);
      const [endHour, endMinute] = sched.endTime.split(":").map(Number);
      const slotDuration = sched.slotDuration || 30;

      let currentMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      while (currentMinutes + slotDuration <= endMinutes) {
        const slotH = Math.floor(currentMinutes / 60);
        const slotM = currentMinutes % 60;
        const timeString = `${slotH.toString().padStart(2, "0")}:${slotM.toString().padStart(2, "0")}`;

        // Compute exact UTC timestamp
        const slotUtc = new Date(
          Date.UTC(year, month - 1, day, slotH, slotM, 0) + timezoneOffsetMinutes * 60 * 1000
        );

        const slotTimeMs = slotUtc.getTime();

        // Must be at least 15 minutes in the future
        if (slotTimeMs > now + 15 * 60 * 1000) {
          // Check collision with booked appointments
          const hasConflict = bookedIntervals.some(
            (b) => slotTimeMs < b.end && slotTimeMs + slotDuration * 60 * 1000 > b.start
          );

          if (!hasConflict) {
            availableSlots.push({
              time: timeString,
              scheduledAtUtc: slotUtc.toISOString(),
            });
          }
        }

        currentMinutes += slotDuration;
      }
    }

    return NextResponse.json({
      date,
      availableSlots,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
