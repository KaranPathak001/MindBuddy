import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthUser();

    // Fetch real circles with real counts
    const circles = await prisma.circle.findMany({
      include: {
        _count: {
          select: {
            members: true,
            posts: {
              where: { isHidden: false },
            },
          },
        },
        ...(user
          ? {
              members: {
                where: { userId: user.id },
                select: { id: true },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = circles.map((circle) => ({
      id: circle.id,
      name: circle.name,
      slug: circle.slug,
      description: circle.description,
      icon: circle.icon,
      memberCount: circle._count.members,
      postCount: circle._count.posts,
      isMember: user ? (circle.members?.length ?? 0) > 0 : false,
      createdAt: circle.createdAt,
    }));

    return NextResponse.json({ circles: formatted });
  } catch (error) {
    console.error("Circles fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch circles" }, { status: 500 });
  }
}
