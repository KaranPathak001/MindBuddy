import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/user-sync";

// ─── ENV HELPER (reused from chat/route.ts pattern) ───────────────────────

type LocalEnvCache = {
  loaded: boolean;
  values: Record<string, string | undefined>;
};

declare global {
  // eslint-disable-next-line no-var
  var __mindhavenLocalEnvCache: LocalEnvCache | undefined;
}

async function getEnvValue(name: string): Promise<string | undefined> {
  const direct = process.env[name];
  if (typeof direct === "string" && direct !== "") return direct;

  const cache =
    global.__mindhavenLocalEnvCache ??
    (global.__mindhavenLocalEnvCache = { loaded: false, values: {} });

  if (!cache.loaded) {
    try {
      const envPath = path.join(process.cwd(), ".env");
      const raw = await fs.readFile(envPath, "utf8");

      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const idx = trimmed.indexOf("=");
        if (idx === -1) continue;

        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1);
        if (val.startsWith(" ")) val = val.slice(1);

        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }

        if (key) cache.values[key] = val;
      }
    } catch {
      // ignore
    } finally {
      cache.loaded = true;
    }
  }

  const fallback = cache.values[name];
  return typeof fallback === "string" && fallback !== "" ? fallback : undefined;
}

// ─── TYPES ────────────────────────────────────────────────────────────────

interface QuestionnaireResponses {
  q1Mind: string;
  q2Weather: string;
  q2WeatherDesc: string;
  q3Conversations: string;
  q4Proud: string;
  q5Body: string;
  q6Change: string;
  q7Tomorrow: string;
}

interface AIMetrics {
  happiness: number;
  stress: number;
  energy: number;
  hope: number;
  social: number;
}

interface AIResponse {
  mood: string;
  emoji: string;
  insight: string;
  metrics: AIMetrics;
  aiFailed?: boolean;
}

// ─── AI INSIGHT GENERATION ───────────────────────────────────────────────

function buildInsightPrompt(responses: QuestionnaireResponses): string {
  return `You are a compassionate mental wellness companion. Based on a user's deep emotional reflection:
1. Detect their primary mood in 1-2 words (e.g., Happy, Peaceful, Reflective, Anxious, Sad, Hopeful, Overwhelmed, Energetic, Grateful, Calm, Exhausted).
2. Choose the single most fitting emoji for that mood (e.g., 😊, 🌿, 💭, 😰, 🌧️, ✨, 🌊, ⚡, 🙏, 😌, 🥱).
3. Provide a brief, warm wellness insight (2-3 sentences).
4. Provide numerical metrics on a scale of 1 to 10 (10 being highest/best for positive traits, but for stress, 10 means highest stress).

USER'S REFLECTION:
1. On their mind: ${responses.q1Mind}
2. Today's weather forecast: ${responses.q2Weather} - ${responses.q2WeatherDesc}
3. Conversations: ${responses.q3Conversations}
4. Proud of / Change: ${responses.q4Proud}
5. Sleep and Body: ${responses.q5Body}
6. If they could change one thing: ${responses.q6Change}
7. Tomorrow: ${responses.q7Tomorrow}

IMPORTANT RULES:
- Do NOT diagnose any medical condition.
- Keep the tone gentle, empathetic, and encouraging.
- Your response MUST be valid JSON, strictly following this structure:
{
  "mood": "Calm & Reflective",
  "emoji": "🌿",
  "insight": "A supportive 2-3 sentence paragraph summarizing their emotional state and offering practical wellness suggestions.",
  "metrics": {
    "happiness": 8,
    "stress": 4,
    "energy": 6,
    "hope": 7,
    "social": 5
  }
}
Return ONLY valid JSON.`;
}

async function generateAIInsight(
  responses: QuestionnaireResponses,
  apiKey: string
): Promise<AIResponse> {
  const prompt = buildInsightPrompt(responses);

  const defaultResponse: AIResponse = {
    mood: "Reflective",
    emoji: "💭",
    insight: "AI analysis is temporarily unavailable, please try again shortly.",
    metrics: { happiness: 5, stress: 5, energy: 5, hope: 5, social: 5 },
    aiFailed: true,
  };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MindHaven",
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [
          {
            role: "system",
            content: "You are a warm, empathetic AI mental wellness companion. You ONLY reply in valid JSON format. You do not include markdown blocks like ```json, just raw JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("OpenRouter API error:", data);
      return defaultResponse;
    }

    const content = data?.choices?.[0]?.message?.content || "";
    
    // Robust JSON extraction (extracts { ... } block even if model includes commentary or ```json blocks)
    let jsonStr = content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON parse error:", e, "Content was:", content);
      return defaultResponse;
    }
    
    return {
      mood: parsed.mood || defaultResponse.mood,
      emoji: parsed.emoji || defaultResponse.emoji,
      insight: parsed.insight || defaultResponse.insight,
      metrics: {
        happiness: parsed.metrics?.happiness || 5,
        stress: parsed.metrics?.stress || 5,
        energy: parsed.metrics?.energy || 5,
        hope: parsed.metrics?.hope || 5,
        social: parsed.metrics?.social || 5,
      },
      aiFailed: false,
    };
  } catch (err) {
    console.error("AI Insight generation error:", err);
    return defaultResponse;
  }
}

// ─── API HANDLER ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const user = await getOrCreateDbUser();
    console.log("[MOOD ASSESS] User from getOrCreateDbUser:", user ? user.id : "null");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - User not logged in" }, { status: 401 });
    }

    const body = await request.json();
    const responses: QuestionnaireResponses = body.responses;

    if (!responses || !responses.q1Mind) {
      return NextResponse.json(
        { error: "Invalid assessment data" },
        { status: 400 }
      );
    }

    const apiKey = await getEnvValue("OPENROUTER_API_KEY");
    console.log("[MOOD ASSESS] !!apiKey from env:", !!apiKey);
    let aiResult: AIResponse;

    if (apiKey) {
      aiResult = await generateAIInsight(responses, apiKey);
    } else {
      console.warn("Missing OPENROUTER_API_KEY in environment");
      aiResult = {
        mood: "Reflective",
        emoji: "💭",
        insight: "AI service is not configured correctly. Please contact support.",
        metrics: { happiness: 5, stress: 5, energy: 5, hope: 5, social: 5 },
        aiFailed: true,
      };
    }

    // Determine an overall score based on metrics
    // Reverse stress so that lower stress = higher score
    const compositeScore = (aiResult.metrics.happiness + (11 - aiResult.metrics.stress) + aiResult.metrics.energy + aiResult.metrics.hope) / 4;
    const intensity = Math.max(1, Math.min(10, Math.round(compositeScore)));

    // Save to database
    const detectedMood = aiResult.mood || "Reflective";
    const detectedEmoji = aiResult.emoji || "💭";

    const log = await prisma.moodLog.create({
      data: {
        userId: user.id,
        mood: detectedMood,
        intensity: intensity,
        note: `Deep Emotional Check-in: ${detectedMood} ${detectedEmoji}`,
        responses: JSON.stringify({ ...responses, metrics: aiResult.metrics, mood: detectedMood, emoji: detectedEmoji }),
        aiInsight: aiResult.insight,
        isAssessment: true,
      },
    });

    return NextResponse.json({
      success: true,
      mood: detectedMood,
      emoji: detectedEmoji,
      aiInsight: aiResult.insight,
      metrics: aiResult.metrics,
      aiFailed: aiResult.aiFailed,
      log: {
        id: log.id,
        createdAt: log.createdAt,
      },
    });
  } catch (error) {
    console.error("Mood Assessment Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
