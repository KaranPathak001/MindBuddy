import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Completely delete user and associated records via cascade
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Clear auth token cookie
    const cookieStore = await cookies();
    cookieStore.delete("token");

    return NextResponse.json({
      success: true,
      message: "Your account and all associated personal data have been completely deleted.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete account";
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
