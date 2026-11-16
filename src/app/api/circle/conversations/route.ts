import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const conversations = await prisma.peerConversation.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                peerProfile: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { lastActivity: "desc" },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Fetch peer conversations error:", error);
    return NextResponse.json({ conversations: [] });
  }
}

// Start or get existing conversation with a user
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { targetUserId } = await request.json();
    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
    }

    // Check if 1-to-1 conversation already exists between these two users
    let existing = await prisma.peerConversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: true,
      },
    });

    if (!existing) {
      existing = await prisma.peerConversation.create({
        data: {
          isAnonymous: true,
          members: {
            create: [{ userId: user.id }, { userId: targetUserId }],
          },
        },
        include: {
          members: true,
        },
      });
    }

    return NextResponse.json({ success: true, conversation: existing });
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate conversation" }, { status: 500 });
  }
}
