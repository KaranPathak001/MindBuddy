import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || "PENDING";

    const reports = await prisma.userReport.findMany({
      where: statusParam !== "ALL" ? { status: statusParam as any } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        reportedUser: {
          select: { id: true, name: true, email: true, isSuspended: true },
        },
      },
    });

    // Also fetch items with moderationFlag
    const flaggedMessages = await prisma.peerMessage.findMany({
      where: { moderationFlag: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        moderationFlag: true,
        isHidden: true,
        createdAt: true,
        senderId: true,
      },
    });

    const flaggedPosts = await prisma.circlePost.findMany({
      where: { moderationFlag: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        content: true,
        moderationFlag: true,
        isHidden: true,
        createdAt: true,
        userId: true,
      },
    });

    return NextResponse.json({
      reports,
      flaggedContent: {
        messages: flaggedMessages,
        posts: flaggedPosts,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load moderation reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const reportActionSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(["DISMISS", "WARN", "HIDE_CONTENT", "SUSPEND_USER"]),
  adminNotes: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }

    const body = await request.json();
    const validation = reportActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid moderation payload" },
        { status: 400 }
      );
    }

    const { reportId, action, adminNotes } = validation.data;

    const report = await prisma.userReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update report status
      await tx.userReport.update({
        where: { id: reportId },
        data: {
          status: action === "DISMISS" ? "DISMISSED" : "RESOLVED",
          reviewedBy: user.email || user.id,
          actionTaken: action,
          adminNotes: adminNotes || undefined,
        },
      });

      // 2. Perform requested moderation action
      if (action === "SUSPEND_USER" && report.reportedId) {
        await tx.user.update({
          where: { id: report.reportedId },
          data: { isSuspended: true },
        });

        // Notify user of suspension
        await tx.notification.create({
          data: {
            userId: report.reportedId,
            type: "SYSTEM",
            title: "Account Suspended",
            message: "Your account has been suspended due to violations of community safety guidelines.",
          },
        });
      } else if (action === "HIDE_CONTENT") {
        if (report.targetType === "POST") {
          await tx.circlePost.updateMany({
            where: { id: report.targetId },
            data: { isHidden: true },
          });
        } else if (report.targetType === "MESSAGE") {
          await tx.peerMessage.updateMany({
            where: { id: report.targetId },
            data: { isHidden: true },
          });
        }
      } else if (action === "WARN" && report.reportedId) {
        await tx.notification.create({
          data: {
            userId: report.reportedId,
            type: "SYSTEM",
            title: "Community Guidelines Warning",
            message: "Please remember to treat fellow peers with respect and maintain a supportive space. Avoid sharing contact information or using abusive language.",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Moderation action (${action}) applied successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to apply moderation action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
