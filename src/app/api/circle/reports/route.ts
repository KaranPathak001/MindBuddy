import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const createReportSchema = z.object({
  targetType: z.enum(["USER", "MESSAGE", "POST"]),
  targetId: z.string().min(1, "Target ID is required"),
  reportedId: z.string().optional().nullable(),
  reason: z.string().min(3, "Please specify a reason (at least 3 characters)"),
  details: z.string().max(1000, "Details cannot exceed 1000 characters").optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // Rate limit: 5 reports per 10 minutes
    const rateCheck = await rateLimiter.check(`report_${user.id}`, 5, 600000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many reports submitted. Please wait before reporting again." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = createReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid report data", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const report = await prisma.userReport.create({
      data: {
        reporterId: user.id,
        reportedId: data.reportedId || null,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        details: data.details || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Report submitted safely. Our moderation team reviews all flags promptly.",
      reportId: report.id,
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
