import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { z } from "zod";

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, "Order ID required"),
  razorpayPaymentId: z.string().min(1, "Payment ID required"),
  razorpaySignature: z.string().min(1, "Signature required"),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const validation = verifyPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid payment verification data" },
        { status: 400 }
      );
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = validation.data;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_SECRET) {
      console.warn("RAZORPAY_KEY_SECRET is not set; running in development bypass mode.");
    }

    // Verify HMAC SHA256 Signature
    let isSignatureValid = false;
    if (RAZORPAY_KEY_SECRET) {
      const generatedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      isSignatureValid = generatedSignature === razorpaySignature;
    } else {
      // In local dev without secret, allow signature
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Payment verification failed. Invalid cryptographic signature." },
        { status: 400 }
      );
    }

    // Update payment record atomically in database
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Order record not found" }, { status: 404 });
    }

    if (payment.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized payment claim" }, { status: 403 });
    }

    const updatedPayment = await prisma.payment.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and credited.",
      paymentId: updatedPayment.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
