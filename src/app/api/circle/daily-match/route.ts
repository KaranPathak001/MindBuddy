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

    const todayDate = new Date().toISOString().split("T")[0];

    // Current user's profile
    const myProfile = await prisma.peerProfile.findUnique({
      where: { userId: user.id },
    });

    // Check if match already computed today
    let daily = await prisma.dailyMatch.findUnique({
      where: {
        userId_matchDate: {
          userId: user.id,
          matchDate: todayDate,
        },
      },
    });

    const blockedUserIds = await getBlockedUserIds(user.id);
    const excludedUserIds = new Set<string>(blockedUserIds);
    excludedUserIds.add(user.id);

    // Also exclude existing active conversations
    const myConversations = await prisma.peerConversationMember.findMany({
      where: { userId: user.id },
      select: {
        conversation: {
          select: {
            members: { select: { userId: true } },
          },
        },
      },
    });
    for (const c of myConversations) {
      for (const m of c.conversation.members) {
        excludedUserIds.add(m.userId);
      }
    }

    // Exclude previously matched users from the last 30 days
    const pastMatches = await prisma.dailyMatch.findMany({
      where: { userId: user.id },
      select: { matchedUserId: true },
    });
    for (const pm of pastMatches) {
      excludedUserIds.add(pm.matchedUserId);
    }

    // If daily match exists, verify matched user is still valid and not blocked
    if (daily) {
      if (blockedUserIds.includes(daily.matchedUserId)) {
        // Obsolete match with blocked user, remove and allow recomputation
        await prisma.dailyMatch.delete({ where: { id: daily.id } });
        daily = null;
      }
    }

    if (!daily) {
      // Find candidate peers
      const candidates = await prisma.peerProfile.findMany({
        where: {
          userId: { notIn: Array.from(excludedUserIds) },
          isAvailable: true,
          user: { isSuspended: false },
        },
      });

      if (candidates.length > 0) {
        // Score candidates based on genuine profile compatibility
        let bestCandidate = candidates[0];
        let highestScore = -1;
        let bestReasons: string[] = [];

        for (const candidate of candidates) {
          let score = 0;
          const reasons: string[] = [];

          if (myProfile) {
            const shared = candidate.interests.filter((i) => myProfile.interests.includes(i));
            if (shared.length > 0) {
              score += shared.length * 20;
              reasons.push(`Shared interests in ${shared.slice(0, 2).join(" & ")}`);
            }

            if (candidate.preferredLanguage === myProfile.preferredLanguage) {
              score += 15;
              reasons.push(`Both prefer speaking in ${candidate.preferredLanguage}`);
            }

            if (candidate.conversationPreference === myProfile.conversationPreference) {
              score += 15;
              reasons.push(`Matching conversation style: ${candidate.conversationPreference.toLowerCase()}`);
            }
          }

          if (reasons.length === 0) {
            reasons.push("Available and open for empathetic peer support");
          }

          if (score > highestScore) {
            highestScore = score;
            bestCandidate = candidate;
            bestReasons = reasons;
          }
        }

        daily = await prisma.dailyMatch.create({
          data: {
            userId: user.id,
            matchedUserId: bestCandidate.userId,
            matchDate: todayDate,
            sharedReasons: bestReasons,
          },
        });
      }
    }

    if (daily) {
      const peerProfile = await prisma.peerProfile.findUnique({
        where: { userId: daily.matchedUserId },
        select: {
          userId: true,
          displayName: true,
          avatarIndex: true,
          bio: true,
          interests: true,
          preferredLanguage: true,
          conversationPreference: true,
        },
      });

      if (peerProfile) {
        // Check connection request status with this peer
        const req = await prisma.connectionRequest.findFirst({
          where: {
            OR: [
              { senderId: user.id, receiverId: peerProfile.userId },
              { senderId: peerProfile.userId, receiverId: user.id },
            ],
          },
        });

        return NextResponse.json({
          dailyMatch: {
            id: daily.id,
            matchDate: daily.matchDate,
            sharedReasons: daily.sharedReasons,
            isActioned: daily.isActioned,
            peer: peerProfile,
            requestStatus: req ? req.status : "NONE",
            isSender: req ? req.senderId === user.id : false,
          },
        });
      }
    }

    // No candidates found - return null with empty state (No fakes/mocks)
    return NextResponse.json({ dailyMatch: null });
  } catch (error) {
    console.error("Daily match error:", error);
    return NextResponse.json({ error: "Failed to fetch daily match" }, { status: 500 });
  }
}
