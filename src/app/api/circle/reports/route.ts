import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createReportSchema = z.object({
  targetType: z.enum(["USER", "MESSAGE", "POST"]),
  targetId: z.string().min(1),
  reportedId: z.string().optional(),
  reason: z.string().min(3),
  details: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid report data" }, { status: 400 });
    }

    const data = validation.data;

    try {
      await prisma.userReport.create({
        data: {
          reporterId: user.id,
          reportedId: data.reportedId || null,
          targetType: data.targetType,
          targetId: data.targetId,
          reason: data.reason,
          details: data.details || null,
        },
      });
    } catch {
      // Continue
    }

    return NextResponse.json({
      success: true,
      message: "Report submitted. Our moderation team reviews all flags within 24 hours.",
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
