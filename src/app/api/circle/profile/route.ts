import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createPeerProfileSchema = z.object({
  displayName: z.string().min(2).max(40),
  avatarIndex: z.number().int().min(1).max(12).default(1),
  bio: z.string().max(280).optional(),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
  preferredLanguage: z.string().default("English"),
  conversationPreference: z.enum([
    "LISTEN",
    "SHARE",
    "CASUAL",
    "FRIENDS",
    "SIMILAR_INTERESTS",
  ]),
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ profile: null }, { status: 401 });
    }

    const profile = await prisma.peerProfile.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get peer profile error:", error);
    return NextResponse.json({ profile: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createPeerProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const profile = await prisma.peerProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: data.displayName,
        avatarIndex: data.avatarIndex,
        bio: data.bio || null,
        interests: data.interests,
        preferredLanguage: data.preferredLanguage,
        conversationPreference: data.conversationPreference,
      },
      create: {
        userId: user.id,
        displayName: data.displayName,
        avatarIndex: data.avatarIndex,
        bio: data.bio || null,
        interests: data.interests,
        preferredLanguage: data.preferredLanguage,
        conversationPreference: data.conversationPreference,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error("Save peer profile error:", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
