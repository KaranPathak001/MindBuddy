import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/user-sync";

export async function GET() {
  try {
    const user = await getOrCreateDbUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const logs = await prisma.moodLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      // fetch up to latest 50 entries
      take: 50,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Mood GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { mood, intensity, note } = body;

    const log = await prisma.moodLog.create({
      data: {
        userId: user.id,
        mood,
        intensity: Number(intensity),
        note,
      },
    });

    return NextResponse.json({ log });
  } catch (error) {
    console.error("Mood POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
