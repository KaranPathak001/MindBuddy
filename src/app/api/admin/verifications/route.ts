import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }

    const pendingVerifications = await prisma.expertVerification.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        expertProfile: {
          select: {
            id: true,
            fullName: true,
            type: true,
            qualifications: true,
            collegeOrHospital: true,
            registrationNumber: true,
            medicalCouncil: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    return NextResponse.json({ verifications: pendingVerifications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load verifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const actionSchema = z.object({
  verificationId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }

    const body = await request.json();
    const validation = actionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid review data" },
        { status: 400 }
      );
    }

    const { verificationId, action, notes } = validation.data;

    const verification = await prisma.expertVerification.findUnique({
      where: { id: verificationId },
      include: { expertProfile: true },
    });

    if (!verification) {
      return NextResponse.json({ error: "Verification not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update verification item
      await tx.expertVerification.update({
        where: { id: verificationId },
        data: {
          status: action,
          notes: notes ? `Reviewed by ${user.name || user.email}: ${notes}` : `Reviewed by ${user.name || user.email}`,
          reviewedAt: new Date(),
        },
      });

      // 2. If approved, approve expertProfile
      if (action === "APPROVED") {
        await tx.expertProfile.update({
          where: { id: verification.expertProfileId },
          data: { verificationStatus: "APPROVED" },
        });

        // Notify expert
        await tx.notification.create({
          data: {
            userId: verification.expertProfile.userId,
            type: "SYSTEM",
            title: "Expert Credentials Approved",
            message: "Congratulations! Your practitioner profile has been approved and is now active on MindHaven Connect.",
            link: "/expert/dashboard",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Expert credentials ${action.toLowerCase()} successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to review verification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
