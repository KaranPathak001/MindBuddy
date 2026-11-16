"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Shield, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: string;
  timestamp: Date;
}

const SUGGESTION_PILLS = [
  "Feeling overwhelmed by college deadlines",
  "How can I manage acute exam panic?",
  "I feel isolated from friends lately",
  "Suggest a quick 3-minute grounding exercise",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/chat");
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(
              data.messages.map((m: { id: string; role: string; content: string; emotion?: string; createdAt: string | Date }) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
                emotion: m.emotion || undefined,
                timestamp: new Date(m.createdAt),
              }))
            );
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content || "I'm listening. Take your time to share whatever feels heavy.",
        emotion: data.emotion,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallback: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I'm here with you. There was a brief connection hiccup, but please feel free to try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-3xl mx-auto px-4">
      {/* Clean Header Bar */}
      <div className="py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="font-semibold text-sm text-foreground">AI Companion</h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span>Encrypted Session</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto space-y-5">
            <div className="h-11 w-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                How are you feeling right now?
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                A safe, confidential space with no judgment. Tap a prompt or type below.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {SUGGESTION_PILLS.map((pill) => (
                <button
                  key={pill}
                  onClick={() => sendMessage(pill)}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] sm:max-w-md p-3.5 text-xs sm:text-sm leading-relaxed",
                        isUser
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none font-normal"
                          : "border border-border bg-card text-foreground rounded-2xl rounded-tl-none"
                      )}
                    >
                      {!isUser && msg.emotion && (
                        <span className="block mb-1 text-[10px] font-semibold text-accent uppercase tracking-wider">
                          {msg.emotion}
                        </span>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="p-3 rounded-2xl border border-border bg-card text-xs text-muted-foreground flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] ml-1">Reflecting...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Rounded Composer Bar */}
      <div className="py-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind..."
            className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          MindHaven provides non-diagnostic emotional support and does not replace emergency medical care.
        </p>
      </div>
    </div>
  );
}
