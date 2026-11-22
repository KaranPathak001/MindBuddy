import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const { id: postId } = await params;
    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const post = await prisma.circlePost.findUnique({
      where: { id: postId },
    });
    if (!post || post.isHidden) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Toggle like in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const existingLike = await tx.circlePostLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId: user.id,
          },
        },
      });

      let hasLiked = false;
      if (existingLike) {
        await tx.circlePostLike.delete({
          where: {
            postId_userId: {
              postId,
              userId: user.id,
            },
          },
        });
        hasLiked = false;
      } else {
        await tx.circlePostLike.create({
          data: {
            postId,
            userId: user.id,
          },
        });
        hasLiked = true;
      }

      const totalLikes = await tx.circlePostLike.count({
        where: { postId },
      });

      await tx.circlePost.update({
        where: { id: postId },
        data: { likesCount: totalLikes },
      });

      return { hasLiked, likesCount: totalLikes };
    });

    return NextResponse.json({
      success: true,
      hasLiked: result.hasLiked,
      likesCount: result.likesCount,
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
