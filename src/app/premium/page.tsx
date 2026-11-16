"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  Video,
  HeartHandshake,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";

export default function PremiumPage() {
  const { user, openAuthModal } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: string, amountPaise: number) => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    try {
      setLoadingTier(tier);
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          type: "SUBSCRIPTION",
          description: `MindHaven ${tier} Membership`,
          metadata: { tier, billingCycle },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Trigger simulated Razorpay verification or flow
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: data.orderId,
            razorpayPaymentId: `pay_${Date.now()}`,
            razorpaySignature: "mock_sig_verified",
          }),
        });
        if (verifyRes.ok) {
          alert(`Successfully subscribed to MindHaven ${tier}! Membership activated.`);
        }
      }
    } catch {
      alert("Error initiating subscription");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4">
            <Crown className="h-3.5 w-3.5" />
            MindHaven Membership
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            Invest in Your <span className="bg-gradient-to-r from-amber-500 via-violet-500 to-teal-500 bg-clip-text text-transparent">Mental Peace</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Transparent, compassionate mental wellness. Choose the plan that supports your journey best.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Tier */}
          <Card className="border-border rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Free</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">₹0</span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Foundational AI support and peer community connections.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  Unlimited Empathetic AI Companion Chat
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  Daily Mood Tracking & History
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  MindHaven Circle Peer Community
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  1-Time 5-Minute Intro Consultation
                </li>
              </ul>
            </div>

            <Button variant="outline" className="mt-8 w-full" disabled>
              Current Active Plan
            </Button>
          </Card>

          {/* MindHaven Plus */}
          <Card className="border-2 border-primary relative rounded-3xl p-6 flex flex-col justify-between shadow-xl bg-card">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-primary text-primary-foreground shadow-sm">
              MOST POPULAR
            </div>

            <div>
              <div className="text-sm font-bold text-primary uppercase tracking-wider">MindHaven Plus</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">₹499</span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Enhanced human support with included monthly consultation credits.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Everything in Free Plan
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <strong>1 Included 30-min Consultation</strong> every month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  15% Discount on all psychiatrist bookings
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Priority slot booking with medical students
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Unlimited AI Clinical Assessment Reports
                </li>
              </ul>
            </div>

            <Button
              className="mt-8 w-full bg-primary hover:bg-primary/90"
              onClick={() => handleSubscribe("Plus", 49900)}
              disabled={loadingTier === "Plus"}
            >
              {loadingTier === "Plus" ? "Processing..." : "Upgrade to Plus"}
            </Button>
          </Card>

          {/* MindHaven Pro */}
          <Card className="border-border rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="text-sm font-bold text-amber-500 uppercase tracking-wider">MindHaven Pro</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">₹1,199</span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Comprehensive therapeutic package with regular doctor follow-ups.
              </p>

              <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  Everything in Plus Plan
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  <strong>3 Included Consultations</strong> every month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  Direct asynchronous follow-up messaging with psychiatrist
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  Exclusive guided video mindfulness retreats
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  Dedicated wellness care coordinator
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="mt-8 w-full border-amber-500/40 text-foreground hover:bg-amber-500/10"
              onClick={() => handleSubscribe("Pro", 119900)}
              disabled={loadingTier === "Pro"}
            >
              {loadingTier === "Pro" ? "Processing..." : "Upgrade to Pro"}
            </Button>
          </Card>
        </div>

        {/* Regulatory note */}
        <p className="mt-12 text-center text-xs text-muted-foreground max-w-xl mx-auto">
          Razorpay secure payments with 256-bit SSL encryption. You can pause or cancel anytime. Subscriptions do not imply indefinite emergency clinical coverage.
        </p>
      </div>
    </div>
  );
}
