import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const { id: circleId } = await params;
    if (!circleId) {
      return NextResponse.json({ error: "Circle ID is required" }, { status: 400 });
    }

    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
    });
    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Idempotent join in transaction syncing memberCount with actual count
    await prisma.$transaction(async (tx) => {
      const existing = await tx.circleMember.findUnique({
        where: {
          circleId_userId: {
            circleId,
            userId: user.id,
          },
        },
      });

      if (!existing) {
        await tx.circleMember.create({
          data: {
            circleId,
            userId: user.id,
          },
        });
      }

      const totalMembers = await tx.circleMember.count({
        where: { circleId },
      });

      await tx.circle.update({
        where: { id: circleId },
        data: { memberCount: totalMembers },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Joined ${circle.name} successfully`,
      isMember: true,
    });
  } catch (error) {
    console.error("Join circle error:", error);
    return NextResponse.json({ error: "Failed to join circle" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const { id: circleId } = await params;
    if (!circleId) {
      return NextResponse.json({ error: "Circle ID is required" }, { status: 400 });
    }

    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
    });
    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Idempotent leave in transaction syncing memberCount with actual count
    await prisma.$transaction(async (tx) => {
      const existing = await tx.circleMember.findUnique({
        where: {
          circleId_userId: {
            circleId,
            userId: user.id,
          },
        },
      });

      if (existing) {
        await tx.circleMember.delete({
          where: {
            circleId_userId: {
              circleId,
              userId: user.id,
            },
          },
        });
      }

      const totalMembers = await tx.circleMember.count({
        where: { circleId },
      });

      await tx.circle.update({
        where: { id: circleId },
        data: { memberCount: totalMembers },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Left ${circle.name} successfully`,
      isMember: false,
    });
  } catch (error) {
    console.error("Leave circle error:", error);
    return NextResponse.json({ error: "Failed to leave circle" }, { status: 500 });
  }
}
