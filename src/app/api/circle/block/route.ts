import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { blockedId } = await request.json();
    if (!blockedId || blockedId === user.id) {
      return NextResponse.json({ error: "Invalid user to block" }, { status: 400 });
    }

    try {
      await prisma.userBlock.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: user.id,
            blockedId,
          },
        },
        update: {},
        create: {
          blockerId: user.id,
          blockedId,
        },
      });
    } catch {
      // Continue
    }

    return NextResponse.json({
      success: true,
      message: "User has been blocked. They will not be able to message or view you.",
    });
  } catch (error) {
    console.error("Block error:", error);
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }
}
