import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher-server";
import { prisma } from "@/lib/db";
import { isBlockedBetween } from "@/lib/blocks";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    if (!pusherServer) {
      return NextResponse.json({ error: "Pusher is not configured on the server" }, { status: 503 });
    }

    // Standard Pusher form-urlencoded or JSON payload
    let socketId: string | null = null;
    let channelName: string | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      socketId = body.socket_id;
      channelName = body.channel_name;
    } else {
      const formData = await request.formData();
      socketId = formData.get("socket_id") as string | null;
      channelName = formData.get("channel_name") as string | null;
    }

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "socket_id and channel_name are required" }, { status: 400 });
    }

    // 1. Authorize private-user-{userId}
    if (channelName.startsWith("private-user-")) {
      const targetUserId = channelName.replace("private-user-", "");
      if (targetUserId !== user.id) {
        return NextResponse.json({ error: "Unauthorized access to user channel" }, { status: 403 });
      }

      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    // 2. Authorize private-conversation-{conversationId}
    if (channelName.startsWith("private-conversation-")) {
      const conversationId = channelName.replace("private-conversation-", "");

      const conversation = await prisma.peerConversation.findUnique({
        where: { id: conversationId },
        include: {
          members: { select: { userId: true } },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      const isMember = conversation.members.some((m) => m.userId === user.id);
      if (!isMember) {
        return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
      }

      // Check block status with other member
      const otherMember = conversation.members.find((m) => m.userId !== user.id);
      if (otherMember) {
        const blocked = await isBlockedBetween(user.id, otherMember.userId);
        if (blocked) {
          return NextResponse.json({ error: "Conversation unavailable due to block" }, { status: 403 });
        }
      }

      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    return NextResponse.json({ error: "Unsupported channel authorization" }, { status: 400 });
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Internal authorization error" }, { status: 500 });
  }
}
