"use client";

import { Phone, BookOpen, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const HELPLINES = [
  {
    name: "Tele-MANAS (Govt. of India)",
    number: "14416 / 1800-891-4416",
    hours: "24/7 Free National Helpline",
    desc: "National tele-mental health programme providing free multi-lingual support across all states.",
  },
  {
    name: "Vandrevala Foundation",
    number: "+91 9999 666 555",
    hours: "24/7 Professional Helpline",
    desc: "Confidential psychological support and crisis intervention by trained clinical professionals.",
  },
  {
    name: "Kiran Mental Health Helpline",
    number: "1800-599-0019",
    hours: "24/7 Toll-Free Support",
    desc: "Govt. Ministry of Social Justice helpline for psychological first aid, anxiety, and distress.",
  },
  {
    name: "iCall (TISS Mumbai)",
    number: "022-2552-1111",
    hours: "Mon – Sat (10 AM to 8 PM)",
    desc: "Professional counselling services provided by the Tata Institute of Social Sciences.",
  },
];

const ARTICLES = [
  {
    title: "Navigating Academic Burnout & Perfectionism",
    category: "Academic Stress",
    desc: "Recognizing somatic symptoms of acute burnout and actionable frameworks to reclaim cognitive space.",
  },
  {
    title: "Hostel Life & Overcoming Disconnection",
    category: "College Life",
    desc: "A thoughtful approach to living away from home, setting personal boundaries, and establishing genuine friendships.",
  },
  {
    title: "Sleep Hygiene in High-Stimulus Environments",
    category: "Rest & Recovery",
    desc: "Practical techniques for students facing screen saturation, late-night study cycles, and insomnia.",
  },
  {
    title: "When to Consult a Psychiatrist",
    category: "Clinical Care",
    desc: "Clear clinical indicators outlining when everyday lifestyle adjustments should transition to licensed medical consultation.",
  },
];

export default function ResourcesPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
      {/* Page Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Resources & Helplines
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Verified emergency hotlines alongside educational mental wellness guides.
        </p>
      </div>

      {/* Prominent Crisis Hotlines */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">
            Emergency Crisis Helplines (India)
          </h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If you or someone you know is in acute psychological distress or experiencing thoughts of self-harm, please contact these verified services immediately. Crisis support is always free and never paywalled.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {HELPLINES.map((h) => (
            <div key={h.name} className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{h.name}</span>
                  <span className="text-[11px] text-muted-foreground">{h.hours}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{h.desc}</p>
              </div>
              <div className="pt-3 mt-3 border-t border-border">
                <a
                  href={`tel:${h.number.replace(/[^0-9]/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline font-mono"
                >
                  <Phone className="h-3 w-3" />
                  {h.number}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Educational Articles */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Wellness Guides & Articles
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evidence-based perspectives on youth mental health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARTICLES.map((art) => (
            <Card key={art.title} className="p-5 flex flex-col justify-between hover:border-accent/40 transition-colors">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">
                  {art.category}
                </span>
                <h3 className="text-sm font-semibold text-foreground leading-snug">
                  {art.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {art.desc}
                </p>
              </div>
              <div className="pt-4 mt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 hover:text-foreground">
                  Read guide <ExternalLink className="h-3 w-3 ml-0.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
