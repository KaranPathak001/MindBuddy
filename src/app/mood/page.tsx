"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Smile,
  Frown,
  Meh,
  Brain,
  TrendingUp,
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
  { value: "happy", label: "Happy", icon: Smile },
  { value: "calm", label: "Calm", icon: Smile },
  { value: "neutral", label: "Neutral", icon: Meh },
  { value: "anxious", label: "Anxious", icon: Frown },
  { value: "sad", label: "Low", icon: Frown },
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

const formatDateShort = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { weekday: "short" });
};

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
          { date: formatDateShort(log.createdAt), mood: log.intensity, intensity: log.intensity },
        ]);

        setSelectedMood(null);
        setIntensity(5);
        setNote("");
        setShowQuickLog(false);
      }
    } catch (error) {
      console.error("Failed to add entry", error);
    }
  };

  const handleAssessmentComplete = () => {
    setShowAssessment(false);
    fetch("/api/mood")
      .then((res) => res.json())
      .then((data) => {
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
        }
      });
  };

  const avgMood =
    entries.length > 0
      ? Math.round((entries.reduce((acc, e) => acc + e.intensity, 0) / entries.length) * 10) / 10
      : 6.5;

  if (showAssessment) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Mood Tracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track daily intensity patterns and observe long-term emotional rhythm.
          </p>
        </div>
        <Button onClick={() => setShowAssessment(true)} size="sm" className="gap-2">
          <Brain className="h-4 w-4" />
          Guided Assessment
        </Button>
      </div>

      {/* Grid: Quick Log + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Log Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">How do you feel today?</CardTitle>
              <button
                onClick={() => setShowQuickLog(!showQuickLog)}
                className="text-xs text-accent hover:underline font-medium"
              >
                {showQuickLog ? "Close" : "+ New Entry"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Log a quick reflection in seconds.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => {
                const isSelected = selectedMood === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => {
                      setSelectedMood(m.value);
                      setShowQuickLog(true);
                    }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      isSelected
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {showQuickLog && selectedMood && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Intensity (1-10):</span>
                  <span className="font-semibold text-foreground">{intensity}</span>
                </div>
                <div className="flex gap-1">
                  {MOOD_SCALE.map((n) => (
                    <button
                      key={n}
                      onClick={() => setIntensity(n)}
                      className={cn(
                        "flex-1 h-7 rounded text-xs transition-colors",
                        intensity >= n ? "bg-accent text-accent-foreground font-semibold" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Optional brief note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button size="sm" onClick={addEntry}>
                  Save Entry
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Average Intensity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {avgMood} <span className="text-sm font-normal text-muted-foreground">/ 10</span>
            </div>
            <div className="pt-2 border-t border-border space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Total Logs:</span>
                <span className="font-medium text-foreground">{entries.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Assessments:</span>
                <span className="font-medium text-foreground">
                  {entries.filter((e) => e.isAssessment).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">7-Day Intensity Rhythm</h3>
          <p className="text-xs text-muted-foreground">Continuous graph of logged emotional intensity</p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
              <YAxis domain={[1, 10]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="intensity"
                stroke="hsl(var(--accent))"
                fill="hsl(var(--accent))"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Log History */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Past Reflections</h3>
          <div className="space-y-2">
            {entries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="p-4 rounded-xl border border-border bg-card flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground capitalize">{entry.mood}</span>
                    <span className="text-muted-foreground">• Intensity {entry.intensity}/10</span>
                    {entry.isAssessment && (
                      <span className="text-[10px] uppercase font-semibold text-accent px-2 py-0.5 rounded-full bg-accent/10">
                        Assessment
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-[11px]">{formatDateFull(entry.date)}</span>
                </div>
                {entry.note && (
                  <p className="text-muted-foreground italic">&ldquo;{entry.note}&rdquo;</p>
                )}
                {entry.aiInsight && (
                  <p className="text-foreground bg-muted/40 p-2.5 rounded-lg border border-border mt-1">
                    {entry.aiInsight}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
