"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  TrendingUp,
  Calendar,
  Plus,
  Smile,
  Frown,
  Meh,
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
}

// Helper to format date for chart
const formatDateShort = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { weekday: "short" });
};

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [chartData, setChartData] = useState<{ date: string; mood: number; intensity: number }[]>([]);

  useEffect(() => {
    const fetchMoods = async () => {
      try {
        const res = await fetch("/api/mood");
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            type LogType = { id: string; mood: string; intensity: number; note?: string; createdAt: string };
            const mappedEntries = data.logs.map((log: LogType) => ({
              id: log.id,
              mood: log.mood,
              intensity: log.intensity,
              note: log.note || undefined,
              date: log.createdAt,
            }));
            
            // Sort entries newest first for the list
            setEntries([...mappedEntries].reverse());

            // Prepare chart data (oldest first, grouped or just raw)
            // To simplify, we'll map each log to a chart point
            const mappedChart = data.logs.map((log: LogType) => {
              // Simple numeric mapping for visualization (1-10 intensity) if needed
              return {
                date: formatDateShort(log.createdAt),
                mood: log.intensity, // Plot intensity on Y axis
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

  const avgMood =
    entries.length > 0
      ? Math.round(
          entries.reduce((acc, e) => acc + e.intensity, 0) / entries.length
        )
      : chartData[chartData.length - 1]?.mood ?? 6;

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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Log mood card */}
          <Card className="lg:col-span-2 glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Log Your Mood
              </CardTitle>
            </CardHeader>
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
          </Card>

          {/* Summary card */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">
                {avgMood}/10
              </div>
              <p className="text-sm text-muted-foreground">
                Average mood score
              </p>
              {entries.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium">Recent entries</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {entries.slice(0, 3).map((e) => (
                      <li key={e.id}>
                        {e.mood} • {e.intensity}/10
                      </li>
                    ))}
                  </ul>
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
      </motion.div>
    </div>
  );
}
