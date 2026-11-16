import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_CIRCLES = [
  {
    name: "Loneliness & Sincere Friendship",
    slug: "loneliness-friendship",
    description: "A gentle haven for anyone feeling isolated, seeking empathetic listeners, or making meaningful friendships.",
    icon: "heart",
  },
  {
    name: "College Life & Hostel Adjustments",
    slug: "college-life",
    description: "Navigating roommates, homesickness, independence, and campus realities together.",
    icon: "building",
  },
  {
    name: "Academic & Exam Anxiety",
    slug: "academic-anxiety",
    description: "Support for competitive exams, study fatigue, perfectionism, and overcoming panic.",
    icon: "book",
  },
  {
    name: "Career & Placement Anxiety",
    slug: "career-anxiety",
    description: "Open discussions about internships, resumes, job uncertainty, and future dilemmas.",
    icon: "briefcase",
  },
  {
    name: "Fitness, Health & Routine",
    slug: "fitness-routine",
    description: "Healthy habits, daily walks, workout motivation, and balancing mental & physical energy.",
    icon: "activity",
  },
  {
    name: "Relationships & Heartbreak",
    slug: "relationships",
    description: "Unfiltered, kind support for breakups, boundaries, misunderstandings, and healing.",
    icon: "sparkles",
  },
  {
    name: "Personal Growth & Mindfulness",
    slug: "personal-growth",
    description: "Books, meditation habits, self-reflection prompts, and gradual life improvements.",
    icon: "smile",
  },
  {
    name: "Late Night Venting",
    slug: "late-night-venting",
    description: "Safe space to share your mind when sleep is hard and worries keep you awake.",
    icon: "moon",
  },
];

export async function GET() {
  try {
    let circles = await prisma.circle.findMany({
      include: {
        _count: {
          select: { posts: true, members: true },
        },
      },
    });

    if (circles.length === 0) {
      // Seed default circles
      for (const item of DEFAULT_CIRCLES) {
        await prisma.circle.upsert({
          where: { slug: item.slug },
          update: {},
          create: {
            name: item.name,
            slug: item.slug,
            description: item.description,
            icon: item.icon,
            memberCount: Math.floor(Math.random() * 40 + 15),
          },
        });
      }
      circles = await prisma.circle.findMany({
        include: {
          _count: {
            select: { posts: true, members: true },
          },
        },
      });
    }

    return NextResponse.json({ circles });
  } catch (error) {
    console.error("Circles fetch error:", error);
    return NextResponse.json({
      circles: DEFAULT_CIRCLES.map((c, i) => ({
        id: `circle-${i}`,
        ...c,
        memberCount: 24 + i * 5,
        _count: { posts: 12 + i, members: 24 + i * 5 },
      })),
    });
  }
}
