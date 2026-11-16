import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Server heartbeat endpoint to track and enforce duration safely
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { consultationId } = await request.json();
    if (!consultationId) {
      return NextResponse.json({ error: "Consultation ID required" }, { status: 400 });
    }

    try {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
      });

      if (!consultation) {
        return NextResponse.json({ active: true, remainingSecs: 300 });
      }

      const elapsedSecs = Math.floor((Date.now() - new Date(consultation.startedAt).getTime()) / 1000);
      const remainingSecs = Math.max(0, consultation.maxAllowedSecs - elapsedSecs);

      // Safe handover: When remaining seconds reach 0 on 5-min trial, do NOT abruptly cut off clinical safety
      const expired = remainingSecs <= 0;

      return NextResponse.json({
        active: !expired,
        elapsedSecs,
        remainingSecs,
        expired,
        type: consultation.type,
      });
    } catch {
      return NextResponse.json({ active: true, remainingSecs: 300, elapsedSecs: 0 });
    }
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }
}
