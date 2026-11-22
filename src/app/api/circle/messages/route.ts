import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlockedBetween } from "@/lib/blocks";
import { rateLimiter } from "@/lib/rate-limit";
import { pusherServer } from "@/lib/pusher-server";
import { detectCrisis, moderateContent } from "@/lib/safety";
import { z } from "zod";

const sendMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message exceeds 2000 characters"),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    // Verify user is a member of this conversation
    const conversation = await prisma.peerConversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isMember = conversation.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if blocked by other member
    const otherMember = conversation.members.find((m) => m.userId !== user.id);
    if (otherMember) {
      const blocked = await isBlockedBetween(user.id, otherMember.userId);
      if (blocked) {
        return NextResponse.json({ error: "Conversation is unavailable" }, { status: 403 });
      }
    }

    // Fetch messages (excluding hidden moderation flagged ones)
    const messages = await prisma.peerMessage.findMany({
      where: {
        conversationId,
        isHidden: false,
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    // Mark messages as read for this user and reset unreadCount
    await prisma.peerConversationMember.updateMany({
      where: {
        conversationId,
        userId: user.id,
      },
      data: {
        unreadCount: 0,
      },
    });

    if (pusherServer) {
      pusherServer.trigger(`private-conversation-${conversationId}`, "messages-read", {
        readerId: user.id,
      }).catch(() => {});
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "Failed to retrieve messages" }, { status: 500 });
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

    // Rate limit: 30 messages/minute
    const rateCheck = await rateLimiter.check(`msg_send_${user.id}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "You are sending messages too quickly. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid message payload" },
        { status: 400 }
      );
    }

    const { conversationId, content } = validation.data;

    // Verify conversation and membership
    const conversation = await prisma.peerConversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const myMembership = conversation.members.find((m) => m.userId === user.id);
    if (!myMembership) {
      return NextResponse.json({ error: "Access denied to conversation" }, { status: 403 });
    }

    const otherMember = conversation.members.find((m) => m.userId !== user.id);
    if (otherMember) {
      const blocked = await isBlockedBetween(user.id, otherMember.userId);
      if (blocked) {
        return NextResponse.json({ error: "Cannot send messages to a blocked user" }, { status: 403 });
      }
    }

    // 1. Content Moderation Check
    const moderation = moderateContent(content);
    if (moderation.action === "reject") {
      return NextResponse.json(
        { error: moderation.reason, code: "MODERATION_VIOLATION" },
        { status: 400 }
      );
    }

    // 2. Crisis Detection Check
    const crisis = await detectCrisis(content);
    const isHighCrisis = crisis.risk === "high";

    const isHidden = moderation.action === "hide";
    const moderationFlag = moderation.flagged
      ? moderation.category
      : isHighCrisis
      ? "CRISIS_ALERT"
      : null;

    // Save message and increment other member's unreadCount in a transaction
    const [message] = await prisma.$transaction([
      prisma.peerMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          content,
          isHidden,
          moderationFlag,
        },
      }),
      prisma.peerConversation.update({
        where: { id: conversationId },
        data: { lastActivity: new Date() },
      }),
      ...(otherMember
        ? [
            prisma.peerConversationMember.update({
              where: {
                conversationId_userId: {
                  conversationId,
                  userId: otherMember.userId,
                },
              },
              data: {
                unreadCount: { increment: 1 },
              },
            }),
          ]
        : []),
      // If high crisis detected, log a UserReport for admin review
      ...(isHighCrisis
        ? [
            prisma.userReport.create({
              data: {
                reporterId: user.id,
                reportedId: user.id,
                targetType: "MESSAGE",
                targetId: conversationId,
                reason: "Automated Crisis Detection",
                details: `System detected acute crisis in message: "${content.substring(0, 100)}..." (${crisis.reason})`,
                status: "PENDING",
              },
            }),
          ]
        : []),
    ]);

    // Push real-time event to conversation channel if not hidden
    if (pusherServer && !isHidden) {
      await pusherServer
        .trigger(`private-conversation-${conversationId}`, "new-message", {
          message: {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
          },
        })
        .catch(() => {});

      // Notify the other user's notification channel
      if (otherMember) {
        await pusherServer
          .trigger(`private-user-${otherMember.userId}`, "new-message-notify", {
            conversationId,
            senderId: user.id,
            snippet: content.substring(0, 60),
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message,
      crisisDetected: isHighCrisis,
      crisisAlert: isHighCrisis
        ? {
            helpline: "Tele-MANAS 14416",
            message: "We care about your safety. Free confidential 24x7 crisis support is available at 14416.",
          }
        : null,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
