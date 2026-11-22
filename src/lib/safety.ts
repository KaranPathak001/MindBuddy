/**
 * src/lib/safety.ts
 * Comprehensive safety, crisis detection, and content moderation engine.
 *
 * Capabilities:
 * 1. detectCrisis(text):
 *    - Hybrid evaluation: Fast English + Hindi / Hinglish regex & keyword patterns.
 *    - Optional OpenRouter/Gemini LLM classification returning { risk: "none" | "low" | "high", reason: string }.
 *    - Deterministic keyword fallback if LLM times out or is unreachable.
 *
 * 2. moderateContent(text):
 *    - Flags harassment, sexual content, hate speech, and sensitive contact sharing (phone, email, social handles).
 *    - Returns { flagged: boolean, action: "allow" | "hide" | "reject", reason?: string }.
 */

export interface CrisisDetectionResult {
  risk: "none" | "low" | "high";
  reason: string;
  matchedKeywords?: string[];
}

export interface ContentModerationResult {
  flagged: boolean;
  action: "allow" | "hide" | "reject";
  reason?: string;
  category?: "harassment" | "sexual" | "hate" | "contact_info" | "safe";
}

// ---------------------------------------------------------------------------
// 1. Crisis Detection Rules (English + Hindi / Hinglish)
// ---------------------------------------------------------------------------

const HIGH_RISK_PATTERNS: RegExp[] = [
  // English severe suicidal intent & self-harm
  /\b(suicide|suicidal)\b/i,
  /\bkill\s+(myself|me)\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bend\s+my\s+life\b/i,
  /\bhang\s+myself\b/i,
  /\btake\s+my\s+own\s+life\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bcut\s+(my\s+wrist|myself)\b/i,
  /\boverdose\s+on\b/i,
  /\bdon'?t\s+want\s+to\s+live\s+(anymore|any\s*more)\b/i,

  // Hindi & Hinglish severe suicidal intent
  /\b(atmahatya|aatmhatya|kudkushi|khudkushi)\b/i,
  /\bmarna\s+chahta\s+hu[nm]?\b/i,
  /\bmarna\s+chahti\s+hu[nm]?\b/i,
  /\bmarne\s+ka\s+man\s+kar\s+raha\b/i,
  /\bjaan\s+de\s+dunga\b/i,
  /\bjaan\s+de\s+dungi\b/i,
  /\bapni\s+jaan\s+lena\b/i,
  /\bzeher\s+kha\b/i,
  /\bnas\s+kat\s+(li|lunga|lungi)\b/i,
  /\bab\s+jeena\s+nahi\s+chahta\b/i,
  /\bab\s+jeena\s+nahi\s+chahti\b/i,
];

const LOW_RISK_PATTERNS: RegExp[] = [
  /\b(hopeless|worthless|can't\s+take\s+this\s+anymore)\b/i,
  /\b(self[-\s]?harm|hurting\s+myself)\b/i,
  /\b(depressed|no\s+point\s+in\s+anything)\b/i,
  /\b(sab\s+kuch\s+khatam\s+ho\s+gaya)\b/i,
  /\b(bohot\s+pareshaan\s+hu[nm]?)\b/i,
];

export async function detectCrisis(text: string): Promise<CrisisDetectionResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { risk: "none", reason: "Empty input" };
  }

  // Fast check: High risk pattern match
  for (const regex of HIGH_RISK_PATTERNS) {
    const match = trimmed.match(regex);
    if (match) {
      return {
        risk: "high",
        reason: `Immediate self-harm or suicidal expression detected (${match[0]}).`,
        matchedKeywords: [match[0]],
      };
    }
  }

  // Fast check: Low risk pattern match
  for (const regex of LOW_RISK_PATTERNS) {
    const match = trimmed.match(regex);
    if (match) {
      return {
        risk: "low",
        reason: `Distress or despair indicator detected (${match[0]}).`,
        matchedKeywords: [match[0]],
      };
    }
  }

  // Optional: LLM Assessment via OpenRouter if configured
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mindhaven.app",
          "X-Title": "MindHaven Safety Engine",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "system",
              content:
                "You are an urgent clinical triage safety classifier for Indian youth mental health. Assess if the text expresses suicidal ideation or imminent self-harm. Respond strictly with JSON: {\"risk\": \"none\" | \"low\" | \"high\", \"reason\": \"<brief>\"}.",
            },
            {
              role: "user",
              content: trimmed,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        if (parsed.risk === "high" || parsed.risk === "low" || parsed.risk === "none") {
          return {
            risk: parsed.risk,
            reason: parsed.reason || "Evaluated by safety model",
          };
        }
      }
    } catch {
      // Graceful fallback to deterministic keyword match
    }
  }

  return { risk: "none", reason: "No distress indicators detected" };
}

// ---------------------------------------------------------------------------
// 2. Content Moderation (Harassment, Sexual, Hate, Contact Info Sharing)
// ---------------------------------------------------------------------------

const PHONE_REGEX = /(\+?91[\s-]?)?[6789]\d{9}\b/;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
const SOCIAL_REGEX = /(insta|instagram|ig|snap|snapchat|telegram|tg|whatsapp|wa|discord)\s*[:@-]?\s*([a-zA-Z0-9._]{3,30})/i;

const REJECT_HATE_HARASSMENT: RegExp[] = [
  /\b(chutiya|bhenchod|madarchod|harami|bhosdike|gandu|randi)\b/i,
  /\b(fuck\s+you|bitch|bastard|cunt|slut|whore)\b/i,
  /\b(kill\s+yourself|go\s+die|kys)\b/i,
  /\b(nigger|faggot|retard)\b/i,
];

const HIDE_SEXUAL_CONTENT: RegExp[] = [
  /\b(porn|nude|nudes|send\s+nudes|sex\s+chat|hookup|blowjob)\b/i,
  /\b(chudai|chodo|lund|gaand|choot)\b/i,
];

export function moderateContent(text: string): ContentModerationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { flagged: false, action: "allow", category: "safe" };
  }

  // 1. Check severe hate / targeted harassment (REJECT)
  for (const regex of REJECT_HATE_HARASSMENT) {
    const match = trimmed.match(regex);
    if (match) {
      return {
        flagged: true,
        action: "reject",
        category: "harassment",
        reason: "Content contains abusive language, harassment, or slurs which violate MindHaven safety guidelines.",
      };
    }
  }

  // 2. Sharing personal phone numbers / social handles in peer spaces (REJECT for safety of minors)
  if (PHONE_REGEX.test(trimmed)) {
    return {
      flagged: true,
      action: "reject",
      category: "contact_info",
      reason: "To protect your privacy and ensure safe peer interactions, sharing personal phone numbers is prohibited.",
    };
  }

  if (EMAIL_REGEX.test(trimmed)) {
    return {
      flagged: true,
      action: "reject",
      category: "contact_info",
      reason: "Sharing personal email addresses is restricted to ensure privacy and prevent off-platform harassment.",
    };
  }

  if (SOCIAL_REGEX.test(trimmed)) {
    return {
      flagged: true,
      action: "reject",
      category: "contact_info",
      reason: "Sharing social media handles (Instagram, Snapchat, Telegram, etc.) is prohibited for user protection.",
    };
  }

  // 3. Sexual / Explicit content (HIDE & Flag for review)
  for (const regex of HIDE_SEXUAL_CONTENT) {
    const match = trimmed.match(regex);
    if (match) {
      return {
        flagged: true,
        action: "hide",
        category: "sexual",
        reason: "Content flagged for sensitive or sexually suggestive themes.",
      };
    }
  }

  return { flagged: false, action: "allow", category: "safe" };
}

// ---------------------------------------------------------------------------
// 3. Certified Crisis Resources (India)
// ---------------------------------------------------------------------------

export const CRISIS_HELPLINES = [
  {
    name: "Tele-MANAS (Govt. of India)",
    number: "14416",
    tollFree: "1800-891-4416",
    hours: "24x7",
    description: "National Tele Mental Health Programme of India, free and confidential support in 20+ languages.",
  },
  {
    name: "KIRAN Helpline",
    number: "1800-599-0019",
    hours: "24x7",
    description: "Ministry of Social Justice & Empowerment mental health rehabilitation helpline.",
  },
  {
    name: "Vandrevala Foundation",
    number: "+91 9999 666 555",
    hours: "24x7",
    description: "Free round-the-clock professional crisis intervention across India.",
  },
  {
    name: "iCall (TISS Mumbai)",
    number: "+91 9152 987 821",
    hours: "Monday to Saturday, 10 AM - 8 PM",
    description: "Psychosocial counselling by trained mental health professionals.",
  },
];
