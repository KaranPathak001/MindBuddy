import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimiter } from "@/lib/rate-limit";
import { detectCrisis, moderateContent } from "@/lib/safety";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120, "Title cannot exceed 120 characters"),
  content: z.string().min(10, "Content must be at least 10 characters").max(3000, "Content cannot exceed 3000 characters"),
  isAnonymous: z.boolean().default(true),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id: circleId } = await params;

    if (!circleId) {
      return NextResponse.json({ error: "Circle ID is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 30);

    const posts = await prisma.circlePost.findMany({
      where: {
        circleId,
        isHidden: false,
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            peerProfile: {
              select: {
                displayName: true,
                avatarIndex: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: {
              where: { isHidden: false },
            },
            likes: true,
          },
        },
        ...(user
          ? {
            likes: {
              where: { userId: user.id },
              select: { id: true },
            },
          }
          : {}),
      },
    });

    let nextCursor: string | null = null;
    let items = posts;
    if (posts.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    const formattedPosts = items.map((p) => {
      const authorProfile = p.author.peerProfile;
      const isMyPost = user?.id === p.userId;

      return {
        id: p.id,
        circleId: p.circleId,
        title: p.title,
        content: p.content,
        isAnonymous: p.isAnonymous,
        likesCount: p._count.likes,
        commentsCount: p._count.comments,
        hasLiked: user ? (p.likes && p.likes.length > 0) : false,
        createdAt: p.createdAt,
        author: {
          id: isMyPost ? p.userId : undefined,
          displayName: p.isAnonymous && !isMyPost ? "Kindred Soul" : authorProfile?.displayName || "Anonymous Peer",
          avatarIndex: authorProfile?.avatarIndex || 1,
        },
      };
    });

    return NextResponse.json({
      posts: formattedPosts,
      nextCursor,
    });
  } catch (error) {
    console.error("Fetch posts error:", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
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

    const { id: circleId } = await params;
    if (!circleId) {
      return NextResponse.json({ error: "Circle ID is required" }, { status: 400 });
    }

    // Rate Limit: 5 posts per hour per user
    const rateCheck = await rateLimiter.check(`post_create_${user.id}`, 5, 3600000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Post limit reached (maximum 5 posts per hour). Please try again later." },
        { status: 429 }
      );
    }

    const membership = await prisma.circleMember.findUnique({
      where: {
        circleId_userId: {
          circleId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You must join this Circle before you can post." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid post data" },
        { status: 400 }
      );
    }

    const { title, content, isAnonymous } = validation.data;
    const combinedText = `${title}\n${content}`;

    // 1. Content Moderation
    const moderation = moderateContent(combinedText);
    if (moderation.action === "reject") {
      return NextResponse.json(
        { error: moderation.reason, code: "MODERATION_VIOLATION" },
        { status: 400 }
      );
    }

    // 2. Crisis Detection
    const crisis = await detectCrisis(combinedText);
    const isHighCrisis = crisis.risk === "high";

    const isHidden = moderation.action === "hide";
    const moderationFlag = moderation.flagged
      ? moderation.category
      : isHighCrisis
        ? "CRISIS_ALERT"
        : null;

    const [post] = await prisma.$transaction([
      prisma.circlePost.create({
        data: {
          circleId,
          userId: user.id,
          title,
          content,
          isAnonymous,
          isHidden,
          moderationFlag,
        },
        include: {
          author: {
            select: {
              peerProfile: {
                select: { displayName: true, avatarIndex: true },
              },
            },
          },
        },
      }),
      // If crisis, create flagged review entry
      ...(isHighCrisis
        ? [
          prisma.userReport.create({
            data: {
              reporterId: user.id,
              reportedId: user.id,
              targetType: "POST",
              targetId: circleId,
              reason: "Automated Crisis Detection",
              details: `System detected acute crisis in post title/content: "${title}" (${crisis.reason})`,
              status: "PENDING",
            },
          }),
        ]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        circleId: post.circleId,
        title: post.title,
        content: post.content,
        isAnonymous: post.isAnonymous,
        likesCount: 0,
        commentsCount: 0,
        hasLiked: false,
        createdAt: post.createdAt,
        author: {
          displayName: post.isAnonymous ? "Kindred Soul" : post.author.peerProfile?.displayName || "Anonymous Peer",
          avatarIndex: post.author.peerProfile?.avatarIndex || 1,
        },
      },
      crisisDetected: isHighCrisis,
      crisisAlert: isHighCrisis
        ? {
          helpline: "Tele-MANAS 14416",
          message: "We noticed you might be going through a really hard time. Immediate, confidential support is available 24x7 at 14416.",
        }
        : null,
    });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Failed to publish post" }, { status: 500 });
  }
}
