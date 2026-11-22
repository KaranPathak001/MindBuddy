import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const blockSchema = z.object({
  blockedId: z.string().min(1, "User ID to block is required"),
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: user.id },
      include: {
        blocked: {
          select: {
            id: true,
            peerProfile: {
              select: {
                displayName: true,
                avatarIndex: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const blockedList = blocks.map((b) => ({
      id: b.id,
      blockedUserId: b.blocked.id,
      displayName: b.blocked.peerProfile?.displayName || "Anonymous Peer",
      avatarIndex: b.blocked.peerProfile?.avatarIndex || 1,
      createdAt: b.createdAt,
    }));

    return NextResponse.json({ blockedUsers: blockedList });
  } catch (error) {
    console.error("Fetch blocked users error:", error);
    return NextResponse.json({ error: "Failed to fetch blocked users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = blockSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid user to block", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { blockedId } = parseResult.data;
    if (blockedId === user.id) {
      return NextResponse.json({ error: "You cannot block yourself" }, { status: 400 });
    }

    // Verify target exists
    const targetUser = await prisma.user.findUnique({
      where: { id: blockedId },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Transactionally create block & delete/cancel pending connection requests
    await prisma.$transaction(async (tx) => {
      await tx.userBlock.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: user.id,
            blockedId,
          },
        },
        update: {},
        create: {
          blockerId: user.id,
          blockedId,
        },
      });

      // Remove any pending connection requests in either direction
      await tx.connectionRequest.deleteMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: blockedId, status: "PENDING" },
            { senderId: blockedId, receiverId: user.id, status: "PENDING" },
          ],
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "User has been blocked. They will not be able to message, request, or view you.",
    });
  } catch (error) {
    console.error("Block error:", error);
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const blockedId = searchParams.get("blockedId");

    if (!blockedId) {
      return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
    }

    const existingBlock = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId,
        },
      },
    });

    if (!existingBlock) {
      return NextResponse.json({ error: "User is not currently blocked" }, { status: 404 });
    }

    await prisma.userBlock.delete({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "User has been unblocked successfully.",
    });
  } catch (error) {
    console.error("Unblock error:", error);
    return NextResponse.json({ error: "Failed to unblock user" }, { status: 500 });
  }
}
