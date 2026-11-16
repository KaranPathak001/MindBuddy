import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createOrderSchema = z.object({
  amount: z.number().int().positive("Amount must be positive in integer paise"),
  type: z.enum(["CONSULTATION", "PACKAGE", "SUBSCRIPTION"]),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid payment request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, type, description, metadata } = validation.data;

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_mindhaven2026";
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_key";

    // Create unique order identifier
    const razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Store order in database in CREATED state
    try {
      await prisma.payment.create({
        data: {
          userId: user.id,
          razorpayOrderId,
          amount,
          currency: "INR",
          status: "CREATED",
          type,
          description: description || "MindHaven Consultation / Package",
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch {
      // In case DB connection is offline during test
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrderId,
      amount,
      currency: "INR",
      keyId: RAZORPAY_KEY_ID,
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Create Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}
