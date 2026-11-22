import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const reviewSchema = z.object({
  expertProfileId: z.string().min(1, "Expert ID required"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  isAnonymous: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { expertProfileId, rating, comment } = parsed.data;

    const expert = await prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
    });

    if (!expert) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    const review = await prisma.$transaction(async (tx) => {
      const rev = await tx.review.create({
        data: {
          userId: user.id,
          expertProfileId,
          rating,
          comment,
        },
      });

      // Recalculate average rating
      const allReviews = await tx.review.findMany({
        where: { expertProfileId },
        select: { rating: true },
      });

      const totalReviews = allReviews.length;
      const averageRating =
        allReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews;

      await tx.expertProfile.update({
        where: { id: expertProfileId },
        data: {
          totalReviews,
          averageRating: parseFloat(averageRating.toFixed(2)),
        },
      });

      return rev;
    });

    return NextResponse.json({ success: true, review });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
