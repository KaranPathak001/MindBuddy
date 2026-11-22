import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const eventId = payload.account_id ? `${payload.account_id}-${payload.created_at}-${event}` : `rzp-${Date.now()}`;

    // Deduplication via WebhookEvent table
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      return NextResponse.json({ received: true, note: "Already processed" }, { status: 200 });
    }

    await prisma.webhookEvent.create({
      data: {
        provider: "razorpay",
        eventId,
        type: event,
        payload,
      },
    });

    // Handle payment events
    const paymentEntity = payload.payload?.payment?.entity;
    if (paymentEntity) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      if (event === "payment.captured" && orderId) {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: orderId },
          data: {
            status: "SUCCESS",
            razorpayPaymentId: paymentId,
          },
        });
      } else if (event === "payment.failed" && orderId) {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: orderId },
          data: { status: "FAILED" },
        });
      }
    }

    // Handle refund events
    const refundEntity = payload.payload?.refund?.entity;
    if (refundEntity && event === "refund.processed") {
      const paymentId = refundEntity.payment_id;
      if (paymentId) {
        await prisma.payment.updateMany({
          where: { razorpayPaymentId: paymentId },
          data: { status: "REFUNDED" },
        });
      }
    }

    // Mark event processed
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}
