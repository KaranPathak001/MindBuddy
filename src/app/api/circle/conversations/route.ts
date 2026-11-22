import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBlockedUserIds } from "@/lib/blocks";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const blockedUserIds = await getBlockedUserIds(user.id);

    const conversations = await prisma.peerConversation.findMany({
      where: {
        AND: [
          {
            members: {
              some: { userId: user.id },
            },
          },
          {
            // Do not show conversation if any member is blocked
            members: {
              none: {
                userId: { in: blockedUserIds },
              },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            user: {
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
        },
        messages: {
          where: { isHidden: false },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { lastActivity: "desc" },
    });

    // Format safely exposing only pseudonymous peer info
    const formatted = conversations.map((conv) => {
      const otherMember = conv.members.find((m) => m.userId !== user.id);
      const myMembership = conv.members.find((m) => m.userId === user.id);

      return {
        id: conv.id,
        isAnonymous: conv.isAnonymous,
        lastActivity: conv.lastActivity,
        createdAt: conv.createdAt,
        unreadCount: myMembership?.unreadCount || 0,
        lastMessage: conv.messages[0] || null,
        peer: otherMember?.user?.peerProfile
          ? {
              userId: otherMember.user.id,
              displayName: otherMember.user.peerProfile.displayName,
              avatarIndex: otherMember.user.peerProfile.avatarIndex,
              bio: otherMember.user.peerProfile.bio,
              interests: otherMember.user.peerProfile.interests,
              preferredLanguage: otherMember.user.peerProfile.preferredLanguage,
              conversationPreference: otherMember.user.peerProfile.conversationPreference,
            }
          : null,
      };
    });

    return NextResponse.json({ conversations: formatted });
  } catch (error) {
    console.error("Fetch peer conversations error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// Direct conversation creation is intentionally blocked to enforce mutual consent via ConnectionRequests
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct peer conversation creation without consent is disabled. Please send a Connection Request via /api/circle/requests. Conversations are created automatically once the peer accepts.",
    },
    { status: 403 }
  );
}
