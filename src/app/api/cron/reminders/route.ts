import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const now = new Date();
    // Window 1: 50 to 70 minutes from now (~1 hour reminder)
    const window1Start = new Date(now.getTime() + 50 * 60 * 1000);
    const window1End = new Date(now.getTime() + 70 * 60 * 1000);

    // Window 2: 5 to 15 minutes from now (~10 minute reminder)
    const window2Start = new Date(now.getTime() + 5 * 60 * 1000);
    const window2End = new Date(now.getTime() + 15 * 60 * 1000);

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        OR: [
          { scheduledAt: { gte: window1Start, lte: window1End } },
          { scheduledAt: { gte: window2Start, lte: window2End } },
        ],
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        expert: { select: { fullName: true } },
      },
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    let emailsSent = 0;
    let notificationsCreated = 0;

    for (const appt of upcomingAppointments) {
      const diffMins = Math.round((new Date(appt.scheduledAt).getTime() - now.getTime()) / 60000);
      const reminderText = diffMins > 30 ? "in about 1 hour" : "in 10 minutes";

      // 1. Create in-app notification
      await prisma.notification.create({
        data: {
          userId: appt.userId,
          type: "APPOINTMENT",
          title: `Upcoming Consultation ${reminderText}`,
          message: `Your session with ${appt.expert.fullName} begins ${reminderText}. Tap to get ready.`,
          link: `/connect`,
        },
      });
      notificationsCreated++;

      // 2. Dispatch email reminder via Resend if configured
      if (resendApiKey && appt.user.email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "MindHaven <reminders@mindhaven.app>",
              to: [appt.user.email],
              subject: `Reminder: Consultation with ${appt.expert.fullName} ${reminderText}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #0f766e;">MindHaven Consultation Reminder</h2>
                  <p>Hello ${appt.user.name || "there"},</p>
                  <p>This is a reminder that your video consultation with <strong>${appt.expert.fullName}</strong> is scheduled to start <strong>${reminderText}</strong>.</p>
                  <p>Time: ${new Date(appt.scheduledAt).toLocaleString("en-IN")}</p>
                  <div style="margin: 24px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/connect" style="background-color: #0f766e; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Enter Consultation Room</a>
                  </div>
                  <p style="color: #64748b; font-size: 12px;">If you need urgent clinical support, India's Tele-MANAS helpline is available 24x7 at 14416.</p>
                </div>
              `,
            }),
          });
          emailsSent++;
        } catch (mailErr) {
          console.error("Resend email dispatch error:", mailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: upcomingAppointments.length,
      notificationsCreated,
      emailsSent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cron reminders failed";
    console.error("Reminder cron error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
