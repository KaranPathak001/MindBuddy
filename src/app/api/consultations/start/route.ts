import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignJWT } from "jose";

const HMS_APP_ACCESS_KEY = process.env.HMS_APP_ACCESS_KEY || "mock_100ms_access_key";
const HMS_APP_SECRET = process.env.HMS_APP_SECRET || "mock_100ms_app_secret";

// Generates a cryptographically signed 100ms client auth token strictly on the backend
async function generate100msToken(roomId: string, userId: string, role: "host" | "guest" = "guest"): Promise<string> {
  const secretKey = new TextEncoder().encode(HMS_APP_SECRET);
  const issuedAt = Math.floor(Date.now() / 1000);
  
  const token = await new SignJWT({
    access_key: HMS_APP_ACCESS_KEY,
    room_id: roomId,
    user_id: userId,
    role: role,
    type: "app",
    version: 2,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 24 * 3600) // 24 hours
    .setJti(Math.random().toString(36).substring(2))
    .sign(secretKey);

  return token;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { expertProfileId, type, appointmentId } = await request.json();

    if (!expertProfileId) {
      return NextResponse.json({ error: "Expert profile ID required" }, { status: 400 });
    }

    const isFreeTrial = type === "FIVE_MIN_FREE";

    // Strict Free Trial Verification on Backend
    if (isFreeTrial) {
      const usage = await prisma.consultationUsage.findUnique({
        where: { userId: user.id },
      });

      if (usage && usage.hasUsedFreeTrial) {
        return NextResponse.json(
          {
            error: "You have already utilized your one-time 5-minute complimentary consultation allowance. Please select a consultation package.",
            code: "TRIAL_ALREADY_USED",
          },
          { status: 403 }
        );
      }
    }

    const roomId = `room-${expertProfileId}-${Date.now().toString(36)}`;
    const maxAllowedSecs = isFreeTrial ? 300 : 1800; // 300s = 5 mins, 1800s = 30 mins

    // Mark trial usage atomically in DB if trial
    let consultation: any = null;
    try {
      consultation = await prisma.$transaction(async (tx) => {
        if (isFreeTrial) {
          await tx.consultationUsage.upsert({
            where: { userId: user.id },
            update: { hasUsedFreeTrial: true, usedAt: new Date() },
            create: { userId: user.id, hasUsedFreeTrial: true, usedAt: new Date() },
          });
        }

        return await tx.consultation.create({
          data: {
            userId: user.id,
            expertProfileId: expertProfileId.startsWith("exp-") ? undefined : expertProfileId,
            appointmentId: appointmentId || null,
            type: isFreeTrial ? "FIVE_MIN_FREE" : "PAID",
            status: "ACTIVE",
            roomId,
            maxAllowedSecs,
          },
        });
      });
    } catch {
      // In case expert is demo mock or not in DB, fallback consultation instance
      consultation = {
        id: `cons-${Date.now()}`,
        userId: user.id,
        expertProfileId,
        type: isFreeTrial ? "FIVE_MIN_FREE" : "PAID",
        status: "ACTIVE",
        roomId,
        startedAt: new Date().toISOString(),
        maxAllowedSecs,
      };
    }

    // Generate secure 100ms token
    const token = await generate100msToken(roomId, user.id, "guest");

    return NextResponse.json({
      success: true,
      consultationId: consultation.id,
      roomId,
      token,
      maxAllowedSecs,
      startedAt: consultation.startedAt,
      isFreeTrial,
    });
  } catch (error: any) {
    console.error("Consultation Start Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start consultation" }, { status: 500 });
  }
}
