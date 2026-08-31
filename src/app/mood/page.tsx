"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  TrendingUp,
  Calendar,
  Plus,
  Smile,
  Frown,
  Meh,
  Sparkles,
  Zap,
  Moon,
  Flame,
  Users,
  ChevronDown,
  ChevronUp,
  Brain,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { MoodAssessment } from "@/components/mood-assessment";

const MOOD_OPTIONS = [
  { value: "happy", label: "Happy", icon: Smile, color: "text-green-500" },
  { value: "calm", label: "Calm", icon: Heart, color: "text-teal-500" },
  { value: "neutral", label: "Okay", icon: Meh, color: "text-yellow-500" },
  { value: "anxious", label: "Anxious", icon: Frown, color: "text-orange-500" },
  { value: "sad", label: "Sad", icon: Frown, color: "text-blue-500" },
];

const MOOD_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface MoodEntry {
  id: string;
  mood: string;
  intensity: number;
  note?: string;
  date: string;
  isAssessment?: boolean;
  stressLevel?: string;
  energyLevel?: string;
  sleepQuality?: string;
  socialLevel?: string;
  aiInsight?: string;
}

// Helper to format date for chart
const formatDateShort = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { weekday: "short" });
};

// Helper to format date nicely
const formatDateFull = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [chartData, setChartData] = useState<{ date: string; mood: number; intensity: number }[]>([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showQuickLog, setShowQuickLog] = useState(false);

  type LogType = {
    id: string;
    mood: string;
    intensity: number;
    note?: string;
    createdAt: string;
    isAssessment?: boolean;
    stressLevel?: string;
    energyLevel?: string;
    sleepQuality?: string;
    socialLevel?: string;
    aiInsight?: string;
  };

  useEffect(() => {
    const fetchMoods = async () => {
      try {
        const res = await fetch("/api/mood");
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            const mappedEntries = data.logs.map((log: LogType) => ({
              id: log.id,
              mood: log.mood,
              intensity: log.intensity,
              note: log.note || undefined,
              date: log.createdAt,
              isAssessment: log.isAssessment || false,
              stressLevel: log.stressLevel || undefined,
              energyLevel: log.energyLevel || undefined,
              sleepQuality: log.sleepQuality || undefined,
              socialLevel: log.socialLevel || undefined,
              aiInsight: log.aiInsight || undefined,
            }));
            
            // Sort entries newest first for the list
            setEntries([...mappedEntries].reverse());

            // Prepare chart data (oldest first, grouped or just raw)
            const mappedChart = data.logs.map((log: LogType) => {
              return {
                date: formatDateShort(log.createdAt),
                mood: log.intensity,
                intensity: log.intensity,
              };
            });
            setChartData(mappedChart);
          }
        }
      } catch (error) {
        console.error("Failed to fetch moods:", error);
      }
    };
    fetchMoods();
  }, []);

  const addEntry = async () => {
    if (!selectedMood) return;

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMood, intensity, note: note || undefined }),
      });

      if (res.ok) {
        const { log } = await res.json();
        const newEntry: MoodEntry = {
          id: log.id,
          mood: log.mood,
          intensity: log.intensity,
          note: log.note || undefined,
          date: log.createdAt,
        };
        
        setEntries((prev) => [newEntry, ...prev]);
        setChartData((prev) => [
          ...prev, 
          { date: formatDateShort(log.createdAt), mood: log.intensity, intensity: log.intensity }
        ]);

        setSelectedMood(null);
        setIntensity(5);
        setNote("");
      }
    } catch (error) {
      console.error("Failed to add entry", error);
    }
  };

  const handleAssessmentComplete = () => {
    // Refetch mood logs to include the new assessment
    const refetch = async () => {
      try {
        const res = await fetch("/api/mood");
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            const mappedEntries = data.logs.map((log: LogType) => ({
              id: log.id,
              mood: log.mood,
              intensity: log.intensity,
              note: log.note || undefined,
              date: log.createdAt,
              isAssessment: log.isAssessment || false,
              stressLevel: log.stressLevel || undefined,
              energyLevel: log.energyLevel || undefined,
              sleepQuality: log.sleepQuality || undefined,
              socialLevel: log.socialLevel || undefined,
              aiInsight: log.aiInsight || undefined,
            }));
            setEntries([...mappedEntries].reverse());
            const mappedChart = data.logs.map((log: LogType) => ({
              date: formatDateShort(log.createdAt),
              mood: log.intensity,
              intensity: log.intensity,
            }));
            setChartData(mappedChart);
          }
        }
      } catch (error) {
        console.error("Failed to refetch moods:", error);
      }
    };
    refetch();
  };

  const avgMood =
    entries.length > 0
      ? Math.round(
          entries.reduce((acc, e) => acc + e.intensity, 0) / entries.length
        )
      : chartData[chartData.length - 1]?.mood ?? 6;

  // ─── Trend Insights ───
  const assessmentEntries = entries.filter((e) => e.isAssessment);
  const moodCounts: Record<string, number> = {};
  entries.forEach((e) => {
    const m = e.mood.toLowerCase();
    moodCounts[m] = (moodCounts[m] || 0) + 1;
  });
  const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // Average stress from assessments
  const stressMap: Record<string, number> = { "Low": 1, "Moderate": 2, "High": 3, "Very High": 4 };
  const avgStress = assessmentEntries.length > 0
    ? assessmentEntries.reduce((acc, e) => acc + (stressMap[e.stressLevel || ""] || 0), 0) / assessmentEntries.length
    : 0;
  const avgStressLabel = avgStress === 0 ? "—" : avgStress <= 1.5 ? "Low" : avgStress <= 2.5 ? "Moderate" : avgStress <= 3.5 ? "High" : "Very High";

  // Mood trend (last 5 entries vs previous 5)
  const recent5 = entries.slice(0, 5);
  const prev5 = entries.slice(5, 10);
  const recentAvg = recent5.length > 0 ? recent5.reduce((a, e) => a + e.intensity, 0) / recent5.length : 0;
  const prevAvg = prev5.length > 0 ? prev5.reduce((a, e) => a + e.intensity, 0) / prev5.length : 0;
  const trendDirection = prev5.length === 0 ? "neutral" : recentAvg > prevAvg + 0.5 ? "up" : recentAvg < prevAvg - 0.5 ? "down" : "stable";

  // ─── If assessment mode is active, show only the assessment ───
  if (showAssessment) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="glass">
          <CardContent className="p-6">
            <MoodAssessment
              onComplete={handleAssessmentComplete}
              onClose={() => setShowAssessment(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Mood Tracker</h1>
          <p className="text-muted-foreground">
            Log how you feel and see your emotional trends over time
          </p>
        </div>

        {/* ─── Emotional Check-in CTA ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="h-1 bg-gradient-to-r from-violet-500 via-primary to-teal-500" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-teal-500/20">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Smart Emotional Check-in</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Take a quick assessment to understand your emotional state with AI-powered insights
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => setShowAssessment(true)}
                  className="gap-2 shrink-0 shadow-lg shadow-primary/25"
                >
                  <Sparkles className="h-4 w-4" />
                  Start Check-in
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Log mood card */}
          <Card className="lg:col-span-2 glass">
            <CardHeader>
              <button
                onClick={() => setShowQuickLog(!showQuickLog)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Mood Log
                </CardTitle>
                {showQuickLog ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            <AnimatePresence>
              {showQuickLog && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-sm font-medium mb-3">How are you feeling?</p>
                      <div className="flex flex-wrap gap-2">
                        {MOOD_OPTIONS.map((m) => {
                          const Icon = m.icon;
                          const isSelected = selectedMood === m.value;
                          return (
                            <Button
                              key={m.value}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="gap-2"
                              onClick={() => setSelectedMood(m.value)}
                            >
                              <Icon className={cn("h-4 w-4", m.color)} />
                              {m.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    {selectedMood && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                      >
                        <p className="text-sm font-medium mb-3">
                          Intensity (1-10): {intensity}
                        </p>
                        <div className="flex gap-1">
                          {MOOD_SCALE.map((n) => (
                            <button
                              key={n}
                              onClick={() => setIntensity(n)}
                              className={cn(
                                "flex-1 h-8 rounded-lg text-xs font-medium transition-colors",
                                intensity >= n
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80"
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Add a note (optional)"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="mt-4 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
                        />
                        <Button className="mt-4 w-full" onClick={addEntry}>
                          Save Mood
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Summary card */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">
                {avgMood}/10
              </div>
              <p className="text-sm text-muted-foreground">
                Average mood score
              </p>

              {/* Trend insights */}
              {entries.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Most common</span>
                    <span className="font-medium capitalize">{mostCommonMood}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Trend</span>
                    <span className={cn(
                      "font-medium flex items-center gap-1",
                      trendDirection === "up" ? "text-emerald-500" :
                      trendDirection === "down" ? "text-red-500" :
                      "text-muted-foreground"
                    )}>
                      {trendDirection === "up" && <TrendingUp className="h-3.5 w-3.5" />}
                      {trendDirection === "up" ? "Improving" :
                       trendDirection === "down" ? "Declining" : "Stable"}
                    </span>
                  </div>
                  {avgStressLabel !== "—" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg. stress</span>
                      <span className={cn(
                        "font-medium",
                        avgStressLabel === "Low" ? "text-emerald-500" :
                        avgStressLabel === "Moderate" ? "text-amber-500" :
                        "text-red-500"
                      )}>
                        {avgStressLabel}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total entries</span>
                    <span className="font-medium">{entries.length}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Emotional Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your mood over the past week
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="moodGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--primary)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted-foreground/20"
                  />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[1, 10]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="var(--primary)"
                    fill="url(#moodGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ─── Mood History ─── */}
        {entries.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Mood History
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Your recent mood entries and assessments
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {entries.slice(0, 10).map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "rounded-xl border p-4 transition-all duration-200",
                      entry.isAssessment
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-muted/20"
                    )}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        {entry.isAssessment ? (
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-teal-500/20 flex items-center justify-center">
                            <Brain className="h-4 w-4 text-primary" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold capitalize">
                              {entry.mood}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {entry.intensity}/10
                            </span>
                            {entry.isAssessment && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                                Assessment
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateFull(entry.date)}
                          </span>
                        </div>
                      </div>
                      {(entry.isAssessment || entry.note) && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            expandedEntry === entry.id && "rotate-180"
                          )}
                        />
                      )}
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedEntry === entry.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-border/50"
                        >
                          {entry.note && !entry.isAssessment && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {entry.note}
                            </p>
                          )}

                          {entry.isAssessment && (
                            <div className="space-y-3">
                              {/* Metric pills */}
                              <div className="flex flex-wrap gap-2">
                                {entry.stressLevel && (
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium",
                                    entry.stressLevel === "Low" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                    entry.stressLevel === "Moderate" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                                    "bg-red-500/10 text-red-600 dark:text-red-400"
                                  )}>
                                    <Flame className="h-3 w-3" />
                                    Stress: {entry.stressLevel}
                                  </span>
                                )}
                                {entry.energyLevel && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Zap className="h-3 w-3" />
                                    Energy: {entry.energyLevel}
                                  </span>
                                )}
                                {entry.sleepQuality && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Moon className="h-3 w-3" />
                                    Sleep: {entry.sleepQuality}
                                  </span>
                                )}
                                {entry.socialLevel && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <Users className="h-3 w-3" />
                                    Social: {entry.socialLevel}
                                  </span>
                                )}
                              </div>

                              {/* AI Insight */}
                              {entry.aiInsight && (
                                <div className="rounded-xl bg-gradient-to-br from-violet-500/5 to-teal-500/5 border border-primary/10 p-4">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-xs font-semibold text-primary">
                                      AI Insight
                                    </span>
                                  </div>
                                  <p className="text-xs leading-relaxed text-muted-foreground">
                                    {entry.aiInsight}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
