"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "I'm feeling anxious about exams",
  "How can I cope with stress?",
  "I need someone to talk to",
  "Suggest a quick relaxation exercise",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("openrouter/auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load settings from local storage on mount
    const savedKey = localStorage.getItem("openRouterApiKey");
    const savedModel = localStorage.getItem("openRouterModel");
    if (savedKey) setApiKey(savedKey);
    if (savedModel && savedModel !== "openrouter/hunter-alpha" && savedModel !== "inclusionai/ling-2.6-1t:free") {
      setModel(savedModel);
    }

    // Load chat history
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

  const saveSettings = (newKey: string, newModel: string) => {
    setApiKey(newKey);
    setModel(newModel);
    localStorage.setItem("openRouterApiKey", newKey);
    localStorage.setItem("openRouterModel", newModel);
  };

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
          apiKey,
          model,
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content || "I'm here to listen. Could you tell me more?",
        emotion: data.emotion,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallback: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I'm having trouble connecting. Please try again. Remember, I'm always here when you need to talk.",
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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      <div className="flex justify-between items-center p-4 border-b border-border glass rounded-t-xl mt-4 mx-4 sm:mx-0">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          MindHaven Chat
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              I&apos;m your AI companion for mental wellness. Share what&apos;s on your
              mind—I&apos;m here to listen without judgment.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6 pb-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <Card
                    className={cn(
                      "max-w-[85%] sm:max-w-md p-4",
                      msg.role === "user"
                        ? "bg-primary/10 border-primary/20"
                        : "glass"
                    )}
                  >
                    {msg.role === "assistant" && msg.emotion && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Detected: {msg.emotion}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <Card className="p-4 glass">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </Card>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border p-4 glass">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind..."
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          <Sparkles className="h-3 w-3 inline mr-1" />
          Your conversations are confidential and not shared
        </p>
      </div>
    </div>
  );
}
