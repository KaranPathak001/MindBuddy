"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Brain,
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  CloudFog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────

interface AIMetrics {
  happiness: number;
  stress: number;
  energy: number;
  hope: number;
  social: number;
}

interface AssessmentResult {
  mood?: string;
  emoji?: string;
  aiInsight: string;
  metrics: AIMetrics;
}

interface MoodAssessmentProps {
  onComplete: () => void;
  onClose: () => void;
}

const WEATHER_OPTIONS = [
  { value: "Sunny", label: "Sunny", icon: Sun, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", activeBg: "bg-amber-500/25 border-amber-500 ring-2 ring-amber-500/30" },
  { value: "Cloudy", label: "Cloudy", icon: Cloud, color: "text-gray-500", bg: "bg-gray-500/10 border-gray-500/30", activeBg: "bg-gray-500/25 border-gray-500 ring-2 ring-gray-500/30" },
  { value: "Rainy", label: "Rainy", icon: CloudRain, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30", activeBg: "bg-blue-500/25 border-blue-500 ring-2 ring-blue-500/30" },
  { value: "Stormy", label: "Stormy", icon: CloudLightning, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30", activeBg: "bg-purple-500/25 border-purple-500 ring-2 ring-purple-500/30" },
  { value: "Foggy", label: "Foggy", icon: CloudFog, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/30", activeBg: "bg-slate-400/25 border-slate-400 ring-2 ring-slate-400/30" },
];

export function MoodAssessment({ onComplete, onClose }: MoodAssessmentProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Deep Reflection Answers
  const [q1Mind, setQ1Mind] = useState("");
  const [q2Weather, setQ2Weather] = useState("");
  const [q2WeatherDesc, setQ2WeatherDesc] = useState("");
  const [q3Conversations, setQ3Conversations] = useState("");
  const [q4Proud, setQ4Proud] = useState("");
  const [q5Body, setQ5Body] = useState("");
  const [q6Change, setQ6Change] = useState("");
  const [q7Tomorrow, setQ7Tomorrow] = useState("");

  const totalSteps = 7;

  const isCurrentStepValid = (): boolean => {
    if (step === 0) return q1Mind.trim().length > 0;
    if (step === 1) return q2Weather !== "" && q2WeatherDesc.trim().length > 0;
    if (step === 2) return q3Conversations.trim().length > 0;
    if (step === 3) return q4Proud.trim().length > 0;
    if (step === 4) return q5Body.trim().length > 0;
    if (step === 5) return q6Change.trim().length > 0;
    if (step === 6) return q7Tomorrow.trim().length > 0;
    return true;
  };

  const goNext = () => {
    if (!isCurrentStepValid()) return;
    setDirection(1);
    
    if (step >= totalSteps - 1) {
      submitAssessment();
    } else {
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const submitAssessment = async () => {
    setLoading(true);
    setError(null);
    setDirection(1);
    setStep(999);

    try {
      const res = await fetch("/api/mood/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: {
            q1Mind,
            q2Weather,
            q2WeatherDesc,
            q3Conversations,
            q4Proud,
            q5Body,
            q6Change,
            q7Tomorrow,
          },
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("You must be logged in to analyze your mood. Please sign in first.");
        }
        const data = await res.json();
        throw new Error(data.error || "Assessment failed");
      }

      const data = await res.json();
      setResult({
        mood: data.mood,
        emoji: data.emoji,
        aiInsight: data.aiInsight,
        metrics: data.metrics,
      });
      setStep(1000);
    } catch (err) {
      console.error("Assessment error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep(1000);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 999) {
      return (
        <motion.div
          key="analyzing"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center">
              <Brain className="h-10 w-10 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">Analyzing Your Reflection</h3>
            <p className="text-muted-foreground text-sm">
              Creating your personalized wellness insight and emotional map...
            </p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </motion.div>
      );
    }

    if (step === 1000) {
      if (error) {
        return (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 space-y-4"
          >
            <p className="text-red-500">{error}</p>
            <Button onClick={() => { setStep(6); setError(null); }}>
              Try Again
            </Button>
          </motion.div>
        );
      }

      if (!result) return null;

      // Transform metrics for Recharts
      const chartData = [
        { subject: 'Happiness', A: result.metrics.happiness, fullMark: 10 },
        { subject: 'Hope', A: result.metrics.hope, fullMark: 10 },
        { subject: 'Social', A: result.metrics.social, fullMark: 10 },
        { subject: 'Energy', A: result.metrics.energy, fullMark: 10 },
        // Reverse stress so the graph looks fuller when things are better
        { subject: 'Calmness', A: 11 - result.metrics.stress, fullMark: 10 }, 
      ];

      return (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-8 w-8 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold">Your Emotional Map</h3>
            <p className="text-sm text-muted-foreground">
              Based on your deep reflection today
            </p>
          </div>

          {/* Detected Mood Banner with Emoji */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-violet-500/10 via-primary/10 to-teal-500/10 p-5 text-center shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Detected Mood State
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl sm:text-5xl filter drop-shadow-sm select-none animate-bounce" style={{ animationDuration: '2s' }}>
                {result.emoji || "✨"}
              </span>
              <div className="text-left">
                <span className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-primary to-teal-400 bg-clip-text text-transparent">
                  {result.mood || "Reflective"}
                </span>
                <p className="text-xs text-muted-foreground">
                  Here is how you're feeling right now
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card border rounded-2xl p-4 shadow-sm h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--foreground)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar name="Mood" dataKey="A" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="overflow-hidden border-0">
              <div className="h-1 bg-gradient-to-r from-violet-500 via-primary to-teal-500" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-sm">AI Wellness Insight</h4>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {result.aiInsight}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center pt-2"
          >
            <Button size="lg" onClick={() => { onComplete(); onClose(); }} className="gap-2 px-8">
              <CheckCircle2 className="h-4 w-4" />
              Done
            </Button>
          </motion.div>
        </motion.div>
      );
    }

    const slideVariants = {
      enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
      center: { x: 0, opacity: 1, scale: 1 },
      exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    };

    const inputClasses = "w-full min-h-[120px] rounded-xl border border-input bg-background/50 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none transition-all";

    return (
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="space-y-6"
        >
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">What's been on your mind the most today?</h3>
              <textarea
                value={q1Mind}
                onChange={(e) => setQ1Mind(e.target.value)}
                placeholder="Write your thoughts here..."
                className={inputClasses}
                autoFocus
              />
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">If today had a weather forecast, what would it be?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {WEATHER_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = q2Weather === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setQ2Weather(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200",
                        isActive ? opt.activeBg : opt.bg,
                        !isActive && "hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn("h-7 w-7", opt.color)} />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <textarea
                value={q2WeatherDesc}
                onChange={(e) => setQ2WeatherDesc(e.target.value)}
                placeholder="Why did you choose this forecast?"
                className={inputClasses}
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">Who did you talk to today, and how did those conversations feel?</h3>
              <textarea
                value={q3Conversations}
                onChange={(e) => setQ3Conversations(e.target.value)}
                placeholder="E.g., I talked to a friend and it felt refreshing..."
                className={inputClasses}
                autoFocus
              />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">What's one thing you did today that you're proud of, or wish had gone differently?</h3>
              <textarea
                value={q4Proud}
                onChange={(e) => setQ4Proud(e.target.value)}
                placeholder="I am proud of..."
                className={inputClasses}
                autoFocus
              />
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">How did you sleep, and how's your body feeling right now?</h3>
              <textarea
                value={q5Body}
                onChange={(e) => setQ5Body(e.target.value)}
                placeholder="I slept okay, but my shoulders feel tense..."
                className={inputClasses}
                autoFocus
              />
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">If you could change one thing about today, what would it be?</h3>
              <textarea
                value={q6Change}
                onChange={(e) => setQ6Change(e.target.value)}
                placeholder="I wish I had..."
                className={inputClasses}
                autoFocus
              />
            </div>
          )}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">What are you looking forward to (or dreading) tomorrow?</h3>
              <textarea
                value={q7Tomorrow}
                onChange={(e) => setQ7Tomorrow(e.target.value)}
                placeholder="I am looking forward to..."
                className={inputClasses}
                autoFocus
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <span className="sr-only">Close</span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
        </Button>
      </div>

      <div className="min-h-[400px] flex flex-col">
        {step < 999 && (
          <div className="mb-8 mt-4">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-3">
              <span>Question {step + 1} of {totalSteps}</span>
              <span>{Math.round(((step) / totalSteps) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((step) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center">
          {renderStep()}
        </div>

        {step < 999 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 0}
              className={cn("gap-2", step === 0 && "opacity-0")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={goNext}
              disabled={!isCurrentStepValid()}
              className="gap-2 px-8 shadow-md"
            >
              {step === totalSteps - 1 ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
