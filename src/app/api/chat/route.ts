import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/user-sync";

interface ChatMessage {
  role: string;
  content: string;
}

const SYSTEM_PROMPT = `You are a warm, empathetic AI mental wellness companion for youth in India.

Your role:
- Listen without judgment
- Offer emotional support and validation
- Suggest coping techniques like breathing, grounding, journaling
- Be culturally sensitive to Indian context (academic pressure, family expectations)
- Never replace professional help
- If user expresses suicidal thoughts encourage contacting helplines
- Keep responses concise (2–4 short paragraphs)
`;

function detectEmotion(text: string): string | null {
  const lower = text.toLowerCase();

  const emotions: Record<string, string[]> = {
    anxious: ["anxious", "worried", "nervous", "stress", "panic"],
    sad: ["sad", "depressed", "lonely", "hopeless", "down"],
    angry: ["angry", "frustrated", "irritated", "annoyed"],
    hopeful: ["hopeful", "better", "positive", "improving"],
    confused: ["confused", "lost", "unsure", "overwhelmed"],
  };

  for (const [emotion, words] of Object.entries(emotions)) {
    if (words.some((w) => lower.includes(w))) {
      return emotion;
    }
  }

  return null;
}

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();

  const crisisWords = [
    "suicide",
    "kill myself",
    "want to die",
    "end my life",
    "self harm",
    "cut myself",
  ];

  return crisisWords.some((w) => lower.includes(w));
}

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

  // Next should load `.env`, but some Windows setups end up with empty/missing runtime env.
  // As a fallback, parse `.env` from the project root.
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
        // Do not trim API keys or other values; keep the exact value after '='
        let val = trimmed.slice(idx + 1);
        if (val.startsWith(" ")) val = val.slice(1);

        if (
          (val.startsWith("\"") && val.endsWith("\"")) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }

        if (key) cache.values[key] = val;
      }
    } catch {
      // ignore: no local `.env` found/readable
    } finally {
      cache.loaded = true;
    }
  }

  const fallback = cache.values[name];
  return typeof fallback === "string" && fallback !== "" ? fallback : undefined;
}

export async function GET() {
  try {
    const user = await getOrCreateDbUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Chat GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body?.messages;
    const clientApiKey = body?.apiKey;
    const clientModel = body?.model || "openrouter/auto";

    // Fallback to env variable if client doesn't provide an API key
    const envApiKey = await getEnvValue("OPENROUTER_API_KEY");
    const OPENROUTER_API_KEY = clientApiKey || envApiKey;

    if (request.headers.get("x-debug-env") === "1") {
      return NextResponse.json({
        hasOpenRouter: Boolean(OPENROUTER_API_KEY),
        openRouterPrefix: OPENROUTER_API_KEY ? OPENROUTER_API_KEY.slice(0, 6) : null,
        nodeEnv: process.env.NODE_ENV ?? null,
        cwd: process.cwd(),
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const lastUser = messages.filter((m: ChatMessage) => m.role === "user").pop();

    if (!lastUser?.content?.trim()) {
      return NextResponse.json({
        content: "I'm here to listen. What’s on your mind today?",
        emotion: null,
      });
    }

    const emotion = detectEmotion(lastUser.content);
    const crisis = detectCrisis(lastUser.content);

    // 🚨 Crisis response
    if (crisis) {
      return NextResponse.json({
        content:
          "I'm really sorry you're feeling this way. You don't have to go through this alone.\n\nIf you're in India you can contact:\n\nKiran Mental Health Helpline: 1800-599-0019\nAASRA: +91 9820466726\n\nPlease consider reaching out to someone you trust or a mental health professional.",
        emotion,
        crisis: true,
      });
    }

    // ==========================
    // OPENROUTER API
    // ==========================
    if (OPENROUTER_API_KEY) {
      const openRouterMessages = messages
        .filter((m: ChatMessage) => m.role !== "system")
        .map((m: ChatMessage) => ({
          role: (m.role === "model" || m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: String(m.content ?? ""),
        }));

      const callOpenRouter = async (modelToUse: string) => {
        return fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter for ranking
            "X-Title": "MindHaven", // Required by OpenRouter for ranking
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...openRouterMessages,
            ],
            temperature: 0.8,
            max_tokens: 300,
          }),
        });
      };

      let res = await callOpenRouter(clientModel);
      let data = await res.json();

      // If requested model fails (e.g. model slug changed or deprecated), fallback to openrouter/auto
      if (!res.ok && clientModel !== "openrouter/auto") {
        console.warn(`Model ${clientModel} failed with status ${res.status}, falling back to openrouter/auto`);
        res = await callOpenRouter("openrouter/auto");
        data = await res.json();
      }

      if (!res.ok) {
        console.error("OpenRouter API error status:", res.status);
        console.error("OpenRouter API error data:", JSON.stringify(data, null, 2));

        return NextResponse.json({
          content:
            "I'm having trouble connecting right now. Please check your API key and try again in a moment.",
          emotion,
        });
      }

      const text =
        data?.choices?.[0]?.message?.content ||
        "I'm here to listen. Tell me more about how you're feeling.";

      const dbUser = await getOrCreateDbUser();
      if (dbUser) {
        // Save user message
        await prisma.chatMessage.create({
          data: {
            userId: dbUser.id,
            role: "user",
            content: lastUser.content,
          }
        });

        // Save assistant message
        await prisma.chatMessage.create({
          data: {
            userId: dbUser.id,
            role: "assistant",
            content: text.trim(),
            emotion: emotion || undefined,
          }
        });
      }

      return NextResponse.json({
        content: text.trim(),
        emotion,
      });
    }

    // ==========================
    // NO API KEY
    // ==========================
    return NextResponse.json({
      content:
        "AI is not configured yet. Add your OpenRouter API key in Settings, or add OPENROUTER_API_KEY in your .env file and restart the server.",
      emotion,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json({
      content:
        "Something went wrong. Please try again later. Remember you are not alone.",
      emotion: null,
    });
  }
}