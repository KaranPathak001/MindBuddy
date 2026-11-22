import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlockedBetween } from "@/lib/blocks";
import { z } from "zod";

const patchRequestSchema = z.object({
  action: z.enum(["accept", "reject", "cancel"]),
});

export async function PATCH(
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = patchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: accept, reject, cancel." },
        { status: 400 }
      );
    }

    const { action } = parseResult.data;

    // Fetch the target connection request
    const connRequest = await prisma.connectionRequest.findUnique({
      where: { id },
    });

    if (!connRequest) {
      return NextResponse.json({ error: "Connection request not found" }, { status: 404 });
    }

    if (connRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Request has already been ${connRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Role & ownership check
    if (action === "cancel") {
      if (connRequest.senderId !== user.id) {
        return NextResponse.json({ error: "Only the sender can cancel this request" }, { status: 403 });
      }

      await prisma.connectionRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json({ success: true, message: "Connection request cancelled" });
    }

    // For accept / reject: user MUST be the receiver
    if (connRequest.receiverId !== user.id) {
      return NextResponse.json({ error: "Only the recipient can respond to this request" }, { status: 403 });
    }

    if (action === "reject") {
      await prisma.connectionRequest.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      return NextResponse.json({ success: true, message: "Connection request declined" });
    }

    // Action is "accept": verify block status
    const blocked = await isBlockedBetween(connRequest.senderId, connRequest.receiverId);
    if (blocked) {
      return NextResponse.json({ error: "Cannot accept request due to block status" }, { status: 403 });
    }

    // Perform acceptance and conversation creation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark request ACCEPTED
      const updatedReq = await tx.connectionRequest.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });

      // 2. Find or create 1-to-1 conversation
      let conversation = await tx.peerConversation.findFirst({
        where: {
          AND: [
            { members: { some: { userId: connRequest.senderId } } },
            { members: { some: { userId: connRequest.receiverId } } },
          ],
        },
      });

      if (!conversation) {
        conversation = await tx.peerConversation.create({
          data: {
            isAnonymous: true,
            members: {
              create: [
                { userId: connRequest.senderId },
                { userId: connRequest.receiverId },
              ],
            },
          },
        });
      }

      // 3. Notify the sender of the match
      const receiverProfile = await tx.peerProfile.findUnique({
        where: { userId: user.id },
      });
      const receiverName = receiverProfile?.displayName || "A companion";

      await tx.notification.create({
        data: {
          userId: connRequest.senderId,
          title: "Connection Request Accepted! 🎉",
          message: `${receiverName} accepted your connection request. You can now chat together.`,
          type: "MATCH",
          link: "/circle?tab=CHATS",
        },
      });

      return { request: updatedReq, conversationId: conversation.id };
    });

    return NextResponse.json({
      success: true,
      message: "Connection request accepted! Conversation started.",
      conversationId: result.conversationId,
    });
  } catch (error) {
    console.error("Patch connection request error:", error);
    return NextResponse.json({ error: "Failed to process connection request" }, { status: 500 });
  }
}
