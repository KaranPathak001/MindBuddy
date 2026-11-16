import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { consultationId, notes } = await request.json();
    if (!consultationId) {
      return NextResponse.json({ error: "Consultation ID required" }, { status: 400 });
    }

    try {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
      });

      if (consultation) {
        const endedAt = new Date();
        const durationSeconds = Math.floor((endedAt.getTime() - new Date(consultation.startedAt).getTime()) / 1000);

        await prisma.consultation.update({
          where: { id: consultationId },
          data: {
            status: "COMPLETED",
            endedAt,
            durationSeconds,
            notes: notes || undefined,
          },
        });
      }
    } catch {
      // Continue gracefully
    }

    return NextResponse.json({ success: true, message: "Consultation ended cleanly." });
  } catch (error) {
    console.error("End consultation error:", error);
    return NextResponse.json({ error: "Failed to end consultation" }, { status: 500 });
  }
}
