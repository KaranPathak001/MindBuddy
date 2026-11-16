"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Clock,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  HeartHandshake,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expert: {
    id: string;
    fullName: string;
    type: string;
    qualifications: string;
    avatarUrl?: string | null;
    consultationPrice: number;
  };
  isFreeTrial?: boolean;
}

export function ConsultationRoomModal({
  isOpen,
  onClose,
  expert,
  isFreeTrial = false,
}: ConsultationModalProps) {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [remainingSecs, setRemainingSecs] = useState(isFreeTrial ? 300 : 1800);
  const [isHandoverPromptOpen, setIsHandoverPromptOpen] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  // Initialize consultation session on modal open
  useEffect(() => {
    if (!isOpen) return;

    let timer: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout;

    const startSession = async () => {
      try {
        setIsConnecting(true);
        const res = await fetch("/api/consultations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expertProfileId: expert.id,
            type: isFreeTrial ? "FIVE_MIN_FREE" : "PAID",
          }),
        });
        const data = await res.json();
        if (data.success) {
          setConsultationId(data.consultationId);
          setRemainingSecs(data.maxAllowedSecs || (isFreeTrial ? 300 : 1800));
        }
      } catch (e) {
        console.error("Failed to start consultation session:", e);
      } finally {
        setIsConnecting(false);
      }
    };

    startSession();

    // Client countdown
    timer = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          setIsHandoverPromptOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Heartbeat verification with backend every 20 seconds
    heartbeatInterval = setInterval(async () => {
      if (!consultationId) return;
      try {
        const res = await fetch("/api/consultations/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId }),
        });
        const data = await res.json();
        if (data.expired) {
          setIsHandoverPromptOpen(true);
        }
      } catch (err) {
        // ignore
      }
    }, 20000);

    return () => {
      clearInterval(timer);
      clearInterval(heartbeatInterval);
    };
  }, [isOpen, expert.id, isFreeTrial]);

  const handleEndCall = async () => {
    if (consultationId) {
      try {
        await fetch("/api/consultations/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId }),
        });
      } catch (e) {
        // ignore
      }
    }
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  {expert.fullName}
                  {expert.type === "PSYCHIATRIST" ? (
                    <span className="text-xs bg-teal-500/20 text-teal-600 dark:text-teal-400 font-medium px-2 py-0.5 rounded-full border border-teal-500/30">
                      Licensed Psychiatrist
                    </span>
                  ) : (
                    <span className="text-xs bg-violet-500/20 text-violet-600 dark:text-violet-400 font-medium px-2 py-0.5 rounded-full border border-violet-500/30">
                      MBBS Peer Supporter
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">{expert.qualifications}</p>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/80 border border-border/80 shadow-sm">
              <Clock className={`h-4 w-4 ${remainingSecs < 60 ? "text-red-500 animate-bounce" : "text-primary"}`} />
              <span className={`text-sm font-mono font-bold ${remainingSecs < 60 ? "text-red-500" : "text-foreground"}`}>
                {formatTime(remainingSecs)}
              </span>
              {isFreeTrial && (
                <span className="text-[10px] uppercase font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                  Free 5-Min Trial
                </span>
              )}
            </div>
          </div>

          {/* Main Stage: Audio / Video Interface */}
          <div className="relative flex-1 bg-zinc-950 min-h-[420px] flex items-center justify-center p-6">
            {/* Simulated Secure Video Stream */}
            <div className="relative w-full h-full max-h-[460px] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              {isConnecting ? (
                <div className="flex flex-col items-center gap-3 text-zinc-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm">Connecting to secure 100ms room...</p>
                </div>
              ) : videoOn ? (
                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950">
                  <div className="text-center">
                    <div className="mx-auto h-24 w-24 rounded-full border-2 border-primary/40 overflow-hidden shadow-lg mb-3">
                      {expert.avatarUrl ? (
                        <img src={expert.avatarUrl} alt={expert.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                          {expert.fullName[0]}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-200">{expert.fullName} is present</p>
                    <p className="text-xs text-zinc-400 mt-1">End-to-End Encrypted Tele-Consultation</p>
                  </div>

                  {/* Pip User Preview */}
                  <div className="absolute bottom-4 right-4 h-28 w-40 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl overflow-hidden flex items-center justify-center">
                    <span className="text-xs text-zinc-400">You (Camera On)</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <VideoOff className="h-12 w-12 text-zinc-600" />
                  <p className="text-sm text-zinc-400">Camera Paused (Audio Only)</p>
                </div>
              )}

              {/* Handover Prompt Modal Overlay when Trial Expires */}
              <AnimatePresence>
                {isHandoverPromptOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 bg-background/95 backdrop-blur-md z-30 p-8 flex flex-col items-center justify-center text-center"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground">Free 5-Minute Consultation Completed</h4>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      Your introductory 5 minutes have concluded. To continue with {expert.fullName}, choose an extended package or schedule a custom follow-up.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-6">
                      <div className="p-3.5 rounded-xl border border-border bg-card text-left hover:border-primary cursor-pointer transition-all">
                        <div className="text-xs font-semibold text-primary">10 Minutes</div>
                        <div className="text-lg font-bold text-foreground mt-1">₹199</div>
                        <div className="text-[11px] text-muted-foreground">Quick clarification</div>
                      </div>
                      <div className="p-3.5 rounded-xl border-2 border-primary bg-primary/5 text-left cursor-pointer">
                        <div className="text-xs font-semibold text-primary">20 Minutes</div>
                        <div className="text-lg font-bold text-foreground mt-1">₹349</div>
                        <div className="text-[11px] text-muted-foreground">Standard continuation</div>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border bg-card text-left hover:border-primary cursor-pointer transition-all">
                        <div className="text-xs font-semibold text-primary">30 Minutes</div>
                        <div className="text-lg font-bold text-foreground mt-1">₹499</div>
                        <div className="text-[11px] text-muted-foreground">Comprehensive session</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                      <Button variant="outline" onClick={handleEndCall}>
                        End Session Gracefully
                      </Button>
                      <Button variant="default" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Purchase Extension
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Consultation never terminates abruptly during acute clinical concerns.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Confidential & Compliant Session
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant={micOn ? "secondary" : "destructive"}
                size="icon"
                onClick={() => setMicOn(!micOn)}
                className="rounded-full h-11 w-11"
              >
                {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={videoOn ? "secondary" : "destructive"}
                size="icon"
                onClick={() => setVideoOn(!videoOn)}
                className="rounded-full h-11 w-11"
              >
                {videoOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <Button
                variant="destructive"
                onClick={handleEndCall}
                className="gap-2 rounded-full px-5 h-11"
              >
                <PhoneOff className="h-5 w-5" />
                End Call
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-right hidden sm:block">
              100ms Secure Cloud
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
