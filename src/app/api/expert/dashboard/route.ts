import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const expert = await prisma.expertProfile.findUnique({
      where: { userId: user.id },
      include: {
        appointments: {
          orderBy: { scheduledAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isAnonymous: true,
              },
            },
          },
        },
        consultations: {
          where: { status: "ACTIVE" },
          orderBy: { startedAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isAnonymous: true,
              },
            },
          },
        },
      },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });
    }

    // Stats calculations
    const completedConsultationsCount = await prisma.consultation.count({
      where: { expertProfileId: expert.id, status: "COMPLETED" },
    });

    const appointmentsTodayCount = await prisma.appointment.count({
      where: {
        expertProfileId: expert.id,
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });

    return NextResponse.json({
      expert: {
        id: expert.id,
        fullName: expert.fullName,
        type: expert.type,
        isAvailableNow: expert.isAvailableNow,
        averageRating: expert.averageRating,
        totalReviews: expert.totalReviews,
        verificationStatus: expert.verificationStatus,
      },
      stats: {
        appointmentsToday: appointmentsTodayCount,
        completedConsultations: completedConsultationsCount,
        totalEarningsPaise: completedConsultationsCount * expert.consultationPrice,
        averageRating: expert.averageRating,
      },
      activeConsultations: expert.consultations.map((c) => ({
        id: c.id,
        hmsRoomId: c.hmsRoomId,
        type: c.type,
        startedAt: c.startedAt,
        clientName: c.user.isAnonymous ? "Anonymous Patient" : c.user.name || "Client",
      })),
      upcomingAppointments: expert.appointments.map((a) => ({
        id: a.id,
        scheduledAt: a.scheduledAt,
        status: a.status,
        durationMinutes: a.durationMinutes,
        clientName: a.user.isAnonymous ? "Anonymous Patient" : a.user.name || "Client",
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const toggleSchema = z.object({
  isAvailableNow: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const expert = await prisma.expertProfile.findUnique({
      where: { userId: user.id },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });
    }

    const updated = await prisma.expertProfile.update({
      where: { id: expert.id },
      data: { isAvailableNow: parsed.data.isAvailableNow },
    });

    return NextResponse.json({
      success: true,
      isAvailableNow: updated.isAvailableNow,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
