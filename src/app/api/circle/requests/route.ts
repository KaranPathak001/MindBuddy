import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlockedBetween } from "@/lib/blocks";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const createRequestSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
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
    const box = searchParams.get("box") || "incoming";

    if (box === "incoming") {
      const incoming = await prisma.connectionRequest.findMany({
        where: {
          receiverId: user.id,
          status: "PENDING",
        },
        include: {
          sender: {
            select: {
              id: true,
              peerProfile: {
                select: {
                  displayName: true,
                  avatarIndex: true,
                  bio: true,
                  interests: true,
                  preferredLanguage: true,
                  conversationPreference: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formatted = incoming.map((req) => ({
        id: req.id,
        status: req.status,
        createdAt: req.createdAt,
        peer: req.sender.peerProfile
          ? {
              userId: req.sender.id,
              displayName: req.sender.peerProfile.displayName,
              avatarIndex: req.sender.peerProfile.avatarIndex,
              bio: req.sender.peerProfile.bio,
              interests: req.sender.peerProfile.interests,
              preferredLanguage: req.sender.peerProfile.preferredLanguage,
              conversationPreference: req.sender.peerProfile.conversationPreference,
            }
          : null,
      }));

      return NextResponse.json({ requests: formatted });
    } else {
      const outgoing = await prisma.connectionRequest.findMany({
        where: {
          senderId: user.id,
        },
        include: {
          receiver: {
            select: {
              id: true,
              peerProfile: {
                select: {
                  displayName: true,
                  avatarIndex: true,
                  bio: true,
                  interests: true,
                  preferredLanguage: true,
                  conversationPreference: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      const formatted = outgoing.map((req) => ({
        id: req.id,
        status: req.status,
        createdAt: req.createdAt,
        peer: req.receiver.peerProfile
          ? {
              userId: req.receiver.id,
              displayName: req.receiver.peerProfile.displayName,
              avatarIndex: req.receiver.peerProfile.avatarIndex,
              bio: req.receiver.peerProfile.bio,
              interests: req.receiver.peerProfile.interests,
              preferredLanguage: req.receiver.peerProfile.preferredLanguage,
              conversationPreference: req.receiver.peerProfile.conversationPreference,
            }
          : null,
      }));

      return NextResponse.json({ requests: formatted });
    }
  } catch (error) {
    console.error("Fetch connection requests error:", error);
    return NextResponse.json({ error: "Failed to fetch connection requests" }, { status: 500 });
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
    const parseResult = createRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { receiverId } = parseResult.data;

    // 1. Cannot request oneself
    if (receiverId === user.id) {
      return NextResponse.json({ error: "You cannot send a connection request to yourself" }, { status: 400 });
    }

    // 2. Sliding window rate limit: max 20 requests per day (86400000 ms)
    const rateCheck = await rateLimiter.check(`req_create_${user.id}`, 20, 86400000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Daily limit reached. You can send up to 20 connection requests per day." },
        { status: 429 }
      );
    }

    // 3. Max 10 active outgoing pending requests
    const pendingOutgoingCount = await prisma.connectionRequest.count({
      where: {
        senderId: user.id,
        status: "PENDING",
      },
    });

    if (pendingOutgoingCount >= 10) {
      return NextResponse.json(
        { error: "You have 10 pending connection requests awaiting responses. Please wait for them to respond before sending more." },
        { status: 400 }
      );
    }

    // 4. Check if blocked
    const blocked = await isBlockedBetween(user.id, receiverId);
    if (blocked) {
      return NextResponse.json({ error: "Unable to connect with this user" }, { status: 403 });
    }

    // 5. Verify receiver exists, is not suspended, and is available for peer discovery
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      include: { peerProfile: true },
    });

    if (!receiver || receiver.isSuspended || !receiver.peerProfile || !receiver.peerProfile.isAvailable) {
      return NextResponse.json({ error: "User is currently unavailable for new connections" }, { status: 400 });
    }

    // 6. Check existing conversation or existing requests between the two
    const existingConversation = await prisma.peerConversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: receiverId } } },
        ],
      },
    });

    if (existingConversation) {
      return NextResponse.json({ error: "You are already connected with this peer in Peer Chats" }, { status: 400 });
    }

    const existingRequest = await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        if (existingRequest.senderId === user.id) {
          return NextResponse.json({ error: "You already have a pending request sent to this user" }, { status: 400 });
        } else {
          return NextResponse.json(
            { error: "This user already sent you a connection request! Check your incoming requests." },
            { status: 400 }
          );
        }
      } else if (existingRequest.status === "ACCEPTED") {
        return NextResponse.json({ error: "You are already connected with this peer" }, { status: 400 });
      }
    }

    // 7. Create request & Notification
    const newRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.connectionRequest.upsert({
        where: {
          senderId_receiverId: {
            senderId: user.id,
            receiverId,
          },
        },
        update: {
          status: "PENDING",
          updatedAt: new Date(),
        },
        create: {
          senderId: user.id,
          receiverId,
          status: "PENDING",
        },
      });

      const senderProfile = await tx.peerProfile.findUnique({
        where: { userId: user.id },
      });
      const senderName = senderProfile?.displayName || "A companion";

      await tx.notification.create({
        data: {
          userId: receiverId,
          title: "New Peer Connection Request",
          message: `${senderName} would like to connect with you in MindHaven Circle.`,
          type: "REQUEST",
          link: "/circle?tab=CHATS",
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      message: "Connection request sent successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("Create connection request error:", error);
    return NextResponse.json({ error: "Failed to send connection request" }, { status: 500 });
  }
}
