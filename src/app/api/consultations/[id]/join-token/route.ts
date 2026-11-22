import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAppToken } from "@/lib/hms";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: "Your account is suspended." },
        { status: 403 }
      );
    }

    const { id: consultationId } = await params;

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        expert: { select: { userId: true } },
      },
    });

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const isPatient = consultation.userId === user.id;
    const isExpert = consultation.expert.userId === user.id;

    if (!isPatient && !isExpert) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (consultation.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This consultation is no longer active" },
        { status: 410 }
      );
    }

    if (!consultation.hmsRoomId) {
      return NextResponse.json(
        { error: "No 100ms room associated with this consultation" },
        { status: 500 }
      );
    }

    const role: "host" | "guest" = isExpert ? "host" : "guest";
    const token = await generateAppToken(consultation.hmsRoomId, user.id, role);

    return NextResponse.json({
      token,
      roomId: consultation.hmsRoomId,
      role,
      consultationId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate join token";
    console.error("Join token error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
