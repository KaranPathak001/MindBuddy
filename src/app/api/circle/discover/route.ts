import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterPref = searchParams.get("preference");
    const filterLang = searchParams.get("language");

    // Get current user's profile to compute match scores
    const myProfile = await prisma.peerProfile.findUnique({
      where: { userId: user.id },
    });

    // Get blocked users to hide completely
    const blocked = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: user.id }, { blockedId: user.id }],
      },
    });
    const excludedUserIds = new Set(
      blocked.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId))
    );
    excludedUserIds.add(user.id);

    const whereClause: any = {
      isAvailable: true,
      userId: { notIn: Array.from(excludedUserIds) },
    };

    if (filterPref) {
      whereClause.conversationPreference = filterPref;
    }
    if (filterLang) {
      whereClause.preferredLanguage = filterLang;
    }

    let peers = await prisma.peerProfile.findMany({
      where: whereClause,
      take: 20,
    });

    // Demo companions fallback when database is fresh
    if (peers.length === 0) {
      peers = getDemoPeers();
    }

    // Rank by shared interests & language
    const scoredPeers = peers.map((peer) => {
      let score = 50;
      let sharedInterests: string[] = [];

      if (myProfile) {
        sharedInterests = peer.interests.filter((i) => myProfile.interests.includes(i));
        score += sharedInterests.length * 15;
        if (peer.preferredLanguage === myProfile.preferredLanguage) score += 20;
        if (peer.conversationPreference === myProfile.conversationPreference) score += 15;
      }

      return {
        ...peer,
        matchScore: Math.min(score, 99),
        sharedInterests,
      };
    });

    scoredPeers.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ peers: scoredPeers });
  } catch (error) {
    console.error("Circle discover error:", error);
    return NextResponse.json({ peers: getDemoPeers() });
  }
}

function getDemoPeers(): any[] {
  return [
    {
      id: "p1",
      userId: "u-aarav",
      displayName: "StarGazer",
      avatarIndex: 3,
      bio: "Engineering student navigating campus burnout. Into indie music, stargazing, and late-night sincere conversations.",
      interests: ["College Life", "Music", "Night Owl", "Indie Rock"],
      preferredLanguage: "English",
      conversationPreference: "FRIENDS",
      isAvailable: true,
      matchScore: 94,
      sharedInterests: ["College Life", "Music"],
    },
    {
      id: "p2",
      userId: "u-tanya",
      displayName: "CalmWave",
      avatarIndex: 5,
      bio: "Looking for someone to talk about anxiety and books. I love listening without judging.",
      interests: ["Reading", "Anxiety Support", "Mindfulness", "Art"],
      preferredLanguage: "English",
      conversationPreference: "LISTEN",
      isAvailable: true,
      matchScore: 88,
      sharedInterests: ["Mindfulness", "Anxiety Support"],
    },
    {
      id: "p3",
      userId: "u-kabir",
      displayName: "ZenRunner",
      avatarIndex: 8,
      bio: "Preparing for civil services. Seeking a casual friend to talk about fitness and de-stressing from study schedules.",
      interests: ["Fitness", "Study Habits", "Personal Growth", "Walking"],
      preferredLanguage: "Hindi",
      conversationPreference: "CASUAL",
      isAvailable: true,
      matchScore: 82,
      sharedInterests: ["Fitness", "Personal Growth"],
    },
  ];
}
