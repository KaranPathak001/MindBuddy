import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ExpertType, VerificationStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type"); // "STUDENT" | "PSYCHIATRIST"
    const search = searchParams.get("search") || "";
    const specialization = searchParams.get("specialization") || "";
    const language = searchParams.get("language") || "";
    const availableNow = searchParams.get("availableNow") === "true";
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : undefined;

    // ONLY APPROVED EXPERTS
    const whereClause: any = {
      verificationStatus: VerificationStatus.APPROVED,
    };

    if (typeParam === "STUDENT") {
      whereClause.type = ExpertType.STUDENT;
    } else if (typeParam === "PSYCHIATRIST") {
      whereClause.type = ExpertType.PSYCHIATRIST;
    }

    if (availableNow) {
      whereClause.isAvailableNow = true;
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      whereClause.consultationPrice = { lte: maxPrice };
    }

    if (search.trim()) {
      whereClause.OR = [
        { fullName: { contains: search.trim(), mode: "insensitive" } },
        { bio: { contains: search.trim(), mode: "insensitive" } },
        { collegeOrHospital: { contains: search.trim(), mode: "insensitive" } },
        { qualifications: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (specialization.trim()) {
      whereClause.specializations = { has: specialization.trim() };
    }

    if (language.trim()) {
      whereClause.languages = { has: language.trim() };
    }

    const experts = await prisma.expertProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: { email: true },
        },
        availabilities: {
          where: { isActive: true },
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { name: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: [
        { isAvailableNow: "desc" },
        { averageRating: "desc" },
      ],
    });

    // Add isDemo flag without exposing the email itself
    const expertsWithDemo = experts.map((e) => ({
      ...e,
      isDemo: e.user?.email?.endsWith("@demo.mindhaven.local") ?? false,
      user: undefined, // strip email from response
    }));

    return NextResponse.json({ experts: expertsWithDemo });
  } catch (error) {
    console.error("Fetch Experts Error:", error);
    return NextResponse.json({ experts: [] });
  }
}
