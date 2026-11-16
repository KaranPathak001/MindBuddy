import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    // Verify user is a member of this conversation
    const membership = await prisma.peerConversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const messages = await prisma.peerMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const { conversationId, content } = validation.data;

    // Verify membership
    const membership = await prisma.peerConversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied to conversation" }, { status: 403 });
    }

    const [message] = await prisma.$transaction([
      prisma.peerMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          content,
        },
      }),
      prisma.peerConversation.update({
        where: { id: conversationId },
        data: { lastActivity: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Post message error:", error);
    return NextResponse.json({ error: error.message || "Failed to deliver message" }, { status: 500 });
  }
}
