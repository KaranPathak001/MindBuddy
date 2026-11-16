import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ eligible: false });
    }

    const usage = await prisma.consultationUsage.findUnique({
      where: { userId: user.id },
    });

    const eligible = !usage || !usage.hasUsedFreeTrial;

    return NextResponse.json({
      eligible,
      hasUsed: !!usage?.hasUsedFreeTrial,
      usedAt: usage?.usedAt || null,
    });
  } catch (error) {
    console.error("Free trial status check error:", error);
    return NextResponse.json({ eligible: true });
  }
}
