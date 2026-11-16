"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageSquare,
  Heart,
  Video,
  Shield,
  Sparkles,
  Users,
  Compass,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TESTIMONIALS = [
  {
    quote: "MindHaven helped me untangle severe exam panic during my final semester. The AI companion listened without judgment at 2 AM.",
    author: "Rohan P.",
    role: "Engineering Student",
  },
  {
    quote: "Consulting a verified psychiatrist privately from my hostel room changed everything for me. Clean, reliable, and completely private.",
    author: "Ananya K.",
    role: "Undergraduate",
  },
  {
    quote: "Finding friends with shared interests in MindHaven Circle made college adjustments so much easier.",
    author: "Siddharth M.",
    role: "2nd Year Student",
  },
  {
    quote: "The mood tracker and daily check-ins gave me tangible visibility over my anxiety triggers.",
    author: "Pooja V.",
    role: "Postgrad Scholar",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* 1. HERO SECTION – Centered Aceternity / Magic UI style */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 border-b border-border">
        {/* Subtle Background Grid with Radial Mask */}
        <div className="absolute inset-0 bg-grid-pattern radial-mask pointer-events-none -z-10" />

        {/* Floating Indigo Spotlight Glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-accent/20 rounded-full blur-[110px] pointer-events-none -z-10"
        />

        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          {/* 1. Small Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-foreground shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Free, private and always on</span>
          </motion.div>

          {/* 2. Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 text-4xl sm:text-6xl md:text-7xl font-bold tracking-tighter leading-[1.05] text-foreground text-balance max-w-3xl sm:max-w-4xl"
          >
            Mental wellness support that{" "}
            <span className="bg-gradient-to-r from-foreground via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              actually listens.
            </span>
          </motion.h1>

          {/* 3. Centered Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto text-balance font-normal leading-relaxed"
          >
            Talk to an empathetic AI, track your mood and build calming habits. Anonymous by default.
          </motion.p>

          {/* 4. Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center"
          >
            <Link href="/chat" className="w-full sm:w-auto">
              <Button size="lg" variant="shimmer" className="w-full sm:w-auto gap-2 text-white">
                Start a conversation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                See how it works
              </Button>
            </Link>
          </motion.div>

          {/* 5. Product Preview Card (Browser Window Style with Soft Indigo Shadow Glow) */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-14 w-full max-w-2xl rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-indigo-500/10 text-left"
          >
            {/* Browser Window Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/80 bg-muted/40 rounded-t-xl">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                mindhaven.app/session
              </div>
              <div className="w-10" />
            </div>

            {/* Mini Chat Stage */}
            <div className="p-4 sm:p-6 space-y-4 bg-background/50 rounded-b-xl">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary text-primary-foreground p-3 text-xs sm:text-sm">
                  I&apos;ve been feeling overwhelmed by college deadlines lately, and I can&apos;t seem to focus.
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-border bg-card p-3 text-xs sm:text-sm text-foreground space-y-1.5">
                  <p>
                    It&apos;s completely understandable to feel frozen when everything piles up at once. Your mind is trying to process too much cognitive noise.
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Would you like to break down just one small task together, or take three deep breaths first?
                  </p>
                </div>
              </div>

              {/* Typing indicator */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] ml-1">MindHaven is active</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. BENTO FEATURE GRID (Aceternity style) */}
      <section id="features" className="py-24 md:py-28 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              Everything you need for peace of mind.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground text-pretty">
              A single platform unifying conversational support, clinical care, and real human community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bento Card 1: AI Chat (Span 2) */}
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 sm:p-8 hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Empathetic AI Companion
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg">
                  24/7 non-judgmental conversational support. Reflect on anxious thoughts, explore emotions, and build grounding routines anytime.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Culturally attuned & youth-focused
                </span>
                <Link href="/chat" className="text-accent font-medium hover:underline inline-flex items-center gap-1">
                  Try Chat &rarr;
                </Link>
              </div>
            </div>

            {/* Bento Card 2: Mood Tracking (Span 1) */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Heart className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Mood & Cadence
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Daily check-ins and seven-day trend lines reveal what influences your emotional headspace.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
                <span>Visual analytics</span>
                <Link href="/mood" className="text-accent font-medium hover:underline">
                  View Trends &rarr;
                </Link>
              </div>
            </div>

            {/* Bento Card 3: Connect Tele-Consultations (Span 1) */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Video className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  MindHaven Connect
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Audio and video consultations with verified MBBS student listeners or licensed psychiatrists.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
                <span>Free 5-min trial</span>
                <Link href="/connect" className="text-accent font-medium hover:underline">
                  Consult Experts &rarr;
                </Link>
              </div>
            </div>

            {/* Bento Card 4: Peer Circles (Span 2) */}
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 sm:p-8 hover:border-accent/40 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  MindHaven Circle
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg">
                  Overcome loneliness without dating swiping. Discover companions matched by shared interests and conversation style under complete pseudonymity.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  No superficial algorithms
                </span>
                <Link href="/circle" className="text-accent font-medium hover:underline inline-flex items-center gap-1">
                  Find a Companion &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="py-24 md:py-28 px-4 sm:px-6 lg:px-8 border-b border-border bg-muted/20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              Simple, intentional, and stigma-free.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground text-pretty">
              Get started in seconds without tedious questionnaires or invasive requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Choose your privacy mode",
                desc: "Explore completely anonymously or register with an email to sync your personal reflections across devices.",
              },
              {
                step: "02",
                title: "Reflect or connect",
                desc: "Talk to our AI companion, log your daily moods, or book a consultation with verified healthcare professionals.",
              },
              {
                step: "03",
                title: "Build lasting resilience",
                desc: "Identify emotional triggers, join peer discussion circles, and access crisis helplines whenever you need them.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                  Step {item.step}
                </span>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. INFINITE MARQUEE TESTIMONIALS (Magic UI style) */}
      <section className="py-24 md:py-28 border-b border-border overflow-hidden">
        <div className="text-center max-w-xl mx-auto mb-12 px-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
            Real youth, real impact.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground text-pretty">
            Hear from students and young adults navigating emotional challenges with MindHaven.
          </p>
        </div>

        {/* Marquee Container with Left and Right Fade Masks */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
          <div className="animate-marquee flex gap-4">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
              <div
                key={idx}
                className="w-[320px] sm:w-[380px] shrink-0 rounded-2xl border border-border bg-card p-6 flex flex-col justify-between"
              >
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{t.author}</span>
                  <span className="text-muted-foreground">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA CARD WITH RADIAL GRADIENT */}
      <section className="py-24 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-border bg-card p-8 sm:p-14 text-center overflow-hidden">
            {/* Faint Radial Glow behind CTA */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
                You don&apos;t have to carry it all alone.
              </h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Take the first step toward clearer headspace. Start with our AI companion or speak to a verified expert today.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/chat">
                  <Button size="lg" variant="shimmer" className="w-full sm:w-auto text-white">
                    Start a conversation
                  </Button>
                </Link>
                <Link href="/connect">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Consult an expert
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. MINIMAL FOOTER */}
      <footer className="border-t border-border py-10 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground bg-card">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <div className="h-5 w-5 rounded bg-accent text-white flex items-center justify-center font-bold text-[10px]">
              M
            </div>
            <span>MindHaven</span>
          </div>

          <div className="flex gap-6">
            <Link href="/resources" className="hover:text-foreground transition-colors">
              Helplines
            </Link>
            <Link href="/connect" className="hover:text-foreground transition-colors">
              Practitioners
            </Link>
            <Link href="/circle" className="hover:text-foreground transition-colors">
              Peer Circle
            </Link>
            <Link href="/premium" className="hover:text-foreground transition-colors">
              Membership
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
          MindHaven is not an emergency psychiatric hospital. If in immediate danger, dial Tele-MANAS (14416) or the Kiran Helpline (1800-599-0019) immediately.
        </p>
      </footer>
    </div>
  );
}
