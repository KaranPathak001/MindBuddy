import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimiter } from "@/lib/rate-limit";
import { detectCrisis, moderateContent } from "@/lib/safety";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment cannot exceed 1000 characters"),
  isAnonymous: z.boolean().default(true),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const comments = await prisma.circleComment.findMany({
      where: {
        postId,
        isHidden: false,
      },
      include: {
        user: {
          select: {
            peerProfile: {
              select: {
                displayName: true,
                avatarIndex: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    const formatted = comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      isAnonymous: c.isAnonymous,
      createdAt: c.createdAt,
      author: {
        displayName: c.user.peerProfile?.displayName || "Kindred Peer",
        avatarIndex: c.user.peerProfile?.avatarIndex || 1,
      },
    }));

    return NextResponse.json({ comments: formatted });
  } catch (error) {
    console.error("Fetch comments error:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    // Rate limit: 20 comments per 10 mins
    const rateCheck = await rateLimiter.check(`cmt_create_${user.id}`, 20, 600000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "You are posting comments too frequently. Please slow down." },
        { status: 429 }
      );
    }

    // Verify post exists and is not hidden
    const post = await prisma.circlePost.findUnique({
      where: { id: postId },
    });

    if (!post || post.isHidden) {
      return NextResponse.json({ error: "Post not found or unavailable" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = createCommentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid comment data" },
        { status: 400 }
      );
    }

    const { content, isAnonymous } = validation.data;

    // 1. Content Moderation
    const moderation = moderateContent(content);
    if (moderation.action === "reject") {
      return NextResponse.json(
        { error: moderation.reason, code: "MODERATION_VIOLATION" },
        { status: 400 }
      );
    }

    // 2. Crisis Detection
    const crisis = await detectCrisis(content);
    const isHighCrisis = crisis.risk === "high";

    const isHidden = moderation.action === "hide";
    const moderationFlag = moderation.flagged
      ? moderation.category
      : isHighCrisis
      ? "CRISIS_ALERT"
      : null;

    const [comment] = await prisma.$transaction([
      prisma.circleComment.create({
        data: {
          postId,
          userId: user.id,
          content,
          isAnonymous,
          isHidden,
          moderationFlag,
        },
        include: {
          user: {
            select: {
              peerProfile: {
                select: {
                  displayName: true,
                  avatarIndex: true,
                },
              },
            },
          },
        },
      }),
      // Flag for review if high crisis
      ...(isHighCrisis
        ? [
            prisma.userReport.create({
              data: {
                reporterId: user.id,
                reportedId: user.id,
                targetType: "COMMENT",
                targetId: postId,
                reason: "Automated Crisis Detection",
                details: `System detected acute crisis in comment: "${content.substring(0, 100)}..." (${crisis.reason})`,
                status: "PENDING",
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        isAnonymous: comment.isAnonymous,
        createdAt: comment.createdAt,
        author: {
          displayName: isAnonymous ? "Kindred Peer" : comment.user.peerProfile?.displayName || "Kindred Peer",
          avatarIndex: comment.user.peerProfile?.avatarIndex || 1,
        },
      },
      crisisDetected: isHighCrisis,
      crisisAlert: isHighCrisis
        ? {
            helpline: "Tele-MANAS 14416",
            message: "Support is always available. Speak with someone caring 24x7 at 14416.",
          }
        : null,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Failed to publish comment" }, { status: 500 });
  }
}
