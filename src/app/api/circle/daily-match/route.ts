import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const todayDate = new Date().toISOString().split("T")[0];

    // Check if match already computed today
    let daily = await prisma.dailyMatch.findUnique({
      where: {
        userId_matchDate: {
          userId: user.id,
          matchDate: todayDate,
        },
      },
    });

    if (!daily) {
      // Find candidate peer
      const candidate = await prisma.peerProfile.findFirst({
        where: {
          userId: { not: user.id },
          isAvailable: true,
        },
      });

      if (candidate) {
        daily = await prisma.dailyMatch.create({
          data: {
            userId: user.id,
            matchedUserId: candidate.userId,
            matchDate: todayDate,
            sharedReasons: ["Shared interest in mindful living", "Compatible conversation preference"],
          },
        });
      }
    }

    // Return daily match with peer details
    if (daily) {
      const peerProfile = await prisma.peerProfile.findUnique({
        where: { userId: daily.matchedUserId },
      });

      return NextResponse.json({
        dailyMatch: {
          ...daily,
          peer: peerProfile || {
            displayName: "SolarKindred",
            avatarIndex: 4,
            bio: "Believes in honest conversations and gentle encouragement.",
            interests: ["Mindfulness", "Daily Motivation", "Journaling"],
            preferredLanguage: "English",
            conversationPreference: "FRIENDS",
          },
        },
      });
    }

    return NextResponse.json({
      dailyMatch: {
        id: "daily-demo",
        matchDate: todayDate,
        sharedReasons: ["Shared interest in gentle conversations", "English language preference"],
        isActioned: false,
        peer: {
          userId: "u-daily-companion",
          displayName: "SolarKindred",
          avatarIndex: 4,
          bio: "Believes in honest conversations, books, and gentle encouragement during stressful days.",
          interests: ["Mindfulness", "Daily Motivation", "Journaling"],
          preferredLanguage: "English",
          conversationPreference: "FRIENDS",
        },
      },
    });
  } catch (error) {
    console.error("Daily match error:", error);
    return NextResponse.json({
      dailyMatch: null,
    });
  }
}
