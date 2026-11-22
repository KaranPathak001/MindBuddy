import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBlockedUserIds } from "@/lib/blocks";

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
    const filterPref = searchParams.get("preference");
    const filterLang = searchParams.get("language");

    // Get current user's profile to compute real match scores
    const myProfile = await prisma.peerProfile.findUnique({
      where: { userId: user.id },
    });

    // 1. Exclude blocked users
    const blockedUserIds = await getBlockedUserIds(user.id);
    const excludedUserIds = new Set<string>(blockedUserIds);
    excludedUserIds.add(user.id);

    // 2. Exclude users we already have an existing conversation with
    const myConversations = await prisma.peerConversationMember.findMany({
      where: { userId: user.id },
      select: {
        conversation: {
          select: {
            members: {
              select: { userId: true },
            },
          },
        },
      },
    });

    for (const c of myConversations) {
      for (const m of c.conversation.members) {
        excludedUserIds.add(m.userId);
      }
    }

    // 3. Find pending requests to show pending status
    const pendingRequests = await prisma.connectionRequest.findMany({
      where: {
        OR: [
          { senderId: user.id, status: "PENDING" },
          { receiverId: user.id, status: "PENDING" },
        ],
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
      },
    });

    const pendingMap = new Map<string, { id: string; isSender: boolean }>();
    for (const req of pendingRequests) {
      const otherId = req.senderId === user.id ? req.receiverId : req.senderId;
      pendingMap.set(otherId, { id: req.id, isSender: req.senderId === user.id });
    }

    const whereClause: any = {
      isAvailable: true,
      userId: { notIn: Array.from(excludedUserIds) },
      user: { isSuspended: false },
    };

    if (filterPref && filterPref !== "ALL") {
      whereClause.conversationPreference = filterPref;
    }
    if (filterLang && filterLang !== "ALL") {
      whereClause.preferredLanguage = filterLang;
    }

    const peers = await prisma.peerProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        displayName: true,
        avatarIndex: true,
        bio: true,
        interests: true,
        preferredLanguage: true,
        conversationPreference: true,
        isAvailable: true,
      },
      take: 30,
    });

    // Rank peers by shared interests, language, and conversation preference
    const scoredPeers = peers.map((peer) => {
      let score = 40;
      let sharedInterests: string[] = [];

      if (myProfile) {
        sharedInterests = peer.interests.filter((item) => myProfile.interests.includes(item));
        score += sharedInterests.length * 15;
        if (peer.preferredLanguage === myProfile.preferredLanguage) score += 20;
        if (peer.conversationPreference === myProfile.conversationPreference) score += 15;
      }

      const pendingInfo = pendingMap.get(peer.userId);

      return {
        ...peer,
        matchScore: Math.min(score, 99),
        sharedInterests,
        requestStatus: pendingInfo
          ? pendingInfo.isSender
            ? "OUTGOING_PENDING"
            : "INCOMING_PENDING"
          : "NONE",
        requestId: pendingInfo?.id || null,
      };
    });

    scoredPeers.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ peers: scoredPeers });
  } catch (error) {
    console.error("Circle discover error:", error);
    return NextResponse.json({ error: "Failed to discover peers" }, { status: 500 });
  }
}
