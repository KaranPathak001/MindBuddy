"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wind,
  Clock,
  BookOpen,
  Lightbulb,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STRESS_TIPS = [
  "Take short breaks every 90 minutes while studying.",
  "Connect with a friend or family member.",
  "Go for a 10-minute walk.",
  "Listen to calming music.",
  "Write down 3 things you're grateful for.",
  "Avoid caffeine close to bedtime.",
  "Practice saying 'no' when you're overwhelmed.",
];

export default function WellnessPage() {
  const [breathPhase, setBreathPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [breathCount, setBreathCount] = useState(0);
  const [meditationSeconds, setMeditationSeconds] = useState(0);
  const [meditationRunning, setMeditationRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (meditationRunning) {
      intervalRef.current = setInterval(() => {
        setMeditationSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [meditationRunning]);

  const startBreathing = () => {
    setBreathPhase("inhale");
    setBreathCount(0);
    const cycle = () => {
      setBreathPhase("inhale");
      setTimeout(() => setBreathPhase("hold"), 4000);
      setTimeout(() => setBreathPhase("exhale"), 7000);
      setTimeout(() => {
        setBreathCount((c) => c + 1);
        if (breathCount < 4) cycle();
        else setBreathPhase("idle");
      }, 11000);
    };
    cycle();
  };

  const stopBreathing = () => setBreathPhase("idle");

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Wellness Tools</h1>
          <p className="text-muted-foreground">
            Breathing, meditation, and stress relief at your fingertips
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Guided Breathing */}
          <Card className="glass overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-teal-500" />
                Guided Breathing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                4-3-4 breathing: Inhale 4s, Hold 3s, Exhale 4s
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    "w-40 h-40 rounded-full flex items-center justify-center mb-6",
                    breathPhase === "idle" && "bg-muted",
                    breathPhase === "inhale" && "bg-teal-500/30",
                    breathPhase === "hold" && "bg-teal-500/50",
                    breathPhase === "exhale" && "bg-teal-500/20"
                  )}
                  animate={
                    breathPhase === "inhale"
                      ? { scale: 1.3 }
                      : breathPhase === "exhale"
                      ? { scale: 0.9 }
                      : { scale: 1 }
                  }
                  transition={{
                    duration: breathPhase === "inhale" ? 4 : breathPhase === "exhale" ? 4 : 0.5,
                  }}
                >
                  <span className="text-lg font-medium">
                    {breathPhase === "idle" && "Ready"}
                    {breathPhase === "inhale" && "Breathe in"}
                    {breathPhase === "hold" && "Hold"}
                    {breathPhase === "exhale" && "Breathe out"}
                  </span>
                </motion.div>
                {breathPhase === "idle" ? (
                  <Button onClick={startBreathing} variant="accent" className="gap-2">
                    <Play className="h-4 w-4" />
                    Start Session
                  </Button>
                ) : (
                  <Button onClick={stopBreathing} variant="outline" className="gap-2">
                    <Pause className="h-4 w-4" />
                    Stop
                  </Button>
                )}
                {breathCount > 0 && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Cycles: {breathCount}/5
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Meditation Timer */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-500" />
                Meditation Timer
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set a timer and focus on your breath
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-mono font-bold text-primary mb-6">
                  {formatTime(meditationSeconds)}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setMeditationRunning(!meditationRunning)}
                    variant={meditationRunning ? "outline" : "default"}
                  >
                    {meditationRunning ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMeditationRunning(false);
                      setMeditationSeconds(0);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stress Relief Tips */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Stress Relief Tips
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Quick ideas when you feel overwhelmed
            </p>
          </CardHeader>
          <CardContent>
            <ul className="grid sm:grid-cols-2 gap-3">
              {STRESS_TIPS.map((tip, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span className="text-sm">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Journaling CTA */}
        <Card className="glass border-primary/20">
          <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Journaling Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Reflect on your thoughts with AI-guided prompts
                </p>
              </div>
            </div>
            <Button asChild>
              <a href="/chat">Open in Chat</a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
