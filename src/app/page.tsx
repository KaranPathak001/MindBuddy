"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  MessageCircle,
  Heart,
  Wind,
  Shield,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: MessageCircle,
    title: "AI Chat Support",
    description:
      "24/7 empathetic conversations with our AI companion. Culturally sensitive, confidential, and always here for you.",
  },
  {
    icon: Heart,
    title: "Mood Tracker",
    description:
      "Log your emotions, visualize trends, and gain insights into your mental wellness journey.",
  },
  {
    icon: Wind,
    title: "Wellness Tools",
    description:
      "Guided breathing, meditation, journaling, and stress relief techniques at your fingertips.",
  },
  {
    icon: Shield,
    title: "Safe & Anonymous",
    description:
      "Your privacy is sacred. Use anonymously or create an account—your data stays protected.",
  },
];

const testimonials = [
  {
    quote:
      "HEALTECH helped me during my toughest semester. The AI never judged me.",
    author: "R.P., 22",
  },
  {
    quote:
      "Finally, a mental health tool that feels Indian and understands our context.",
    author: "A.K., 19",
  },
  {
    quote:
      "The breathing exercises and journaling have become part of my daily routine.",
    author: "S.M., 21",
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-primary font-medium mb-4 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Mental Wellness for Youth
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Your Safe Space for
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-500 to-teal-400 bg-clip-text text-transparent">
                Mental Wellness
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Confidential, empathetic, and stigma-free. Access emotional
              support, guidance, and wellness tools—anytime, anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chat">
                <Button size="lg" className="gap-2 text-base px-8">
                  Start a Conversation
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="outline" className="text-base px-8">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-4"
          >
            How We Help
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-muted-foreground text-center max-w-2xl mx-auto mb-16"
          >
            Everything you need to nurture your mental wellbeing, in one place.
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full glass hover:border-primary/30 transition-colors group">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30 dark:bg-muted/10">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold mb-16"
          >
            How It Works
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              "Sign up or use anonymously. No pressure.",
              "Chat with our AI, track mood, use wellness tools.",
              "Build habits and get insights over time.",
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-5xl font-bold text-primary/20 mb-2">
                  {i + 1}
                </div>
                <p className="text-foreground">{step}</p>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-primary/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-16"
          >
            What Youth Are Saying
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Card className="h-full glass">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground italic mb-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p className="text-sm font-medium">— {t.author}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <Card className="glass border-primary/20 overflow-hidden">
            <div className="p-12 bg-gradient-to-br from-violet-500/10 via-transparent to-teal-500/10">
              <h2 className="text-2xl font-bold mb-4">
                Ready to Take the First Step?
              </h2>
              <p className="text-muted-foreground mb-8">
                Your journey to better mental wellness starts here. Free,
                confidential, and always here for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/chat">
                  <Button size="lg" variant="accent" className="gap-2">
                    Try AI Chat Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button size="lg" variant="outline">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-bold bg-gradient-to-r from-violet-500 to-teal-500 bg-clip-text text-transparent">
            HEALTECH
          </span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/resources" className="hover:text-foreground">
              Resources
            </Link>
            <Link href="/community" className="hover:text-foreground">
              Community
            </Link>
            <Link href="/auth" className="hover:text-foreground">
              Login
            </Link>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          If you&apos;re in crisis, please reach out to a helpline. HEALTECH
          complements, but does not replace, professional care.
        </p>
      </footer>
    </div>
  );
}
