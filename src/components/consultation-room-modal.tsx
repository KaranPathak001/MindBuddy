"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Clock,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Star,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectLocalPeer,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  useVideo,
  HMSPeer,
} from "@100mslive/react-sdk";

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
  appointmentId?: string | null;
}

// Subcomponent: Video Tile for a Single Peer
function PeerVideoTile({ peer, isLocal = false }: { peer: HMSPeer; isLocal?: boolean }) {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
      {peer.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <div className="h-16 w-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-300 mb-2">
            {peer.name?.[0] || "U"}
          </div>
          <p className="text-xs text-zinc-400 font-medium">{peer.name}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Video off</p>
        </div>
      )}

      {/* Label Overlay */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[11px] text-zinc-200 border border-white/10 flex items-center gap-1.5">
        <span>{isLocal ? "You" : peer.name}</span>
        {peer.roleName === "host" && (
          <span className="text-[9px] bg-teal-500/20 text-teal-400 px-1 rounded font-semibold">
            Practitioner
          </span>
        )}
      </div>
    </div>
  );
}

// Inner Component with HMS Hooks
function ActiveRoomContent({
  expert,
  isFreeTrial,
  appointmentId,
  onClose,
}: {
  expert: ConsultationModalProps["expert"];
  isFreeTrial: boolean;
  appointmentId?: string | null;
  onClose: () => void;
}) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [remainingSecs, setRemainingSecs] = useState<number>(isFreeTrial ? 300 : 1800);
  const [isHandoverPromptOpen, setIsHandoverPromptOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devicePermissionError, setDevicePermissionError] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const hasLeftRef = useRef(false);

  // 1. Initialize Consultation Session on mount
  useEffect(() => {
    let isCancelled = false;

    async function initSession() {
      try {
        setErrorMessage(null);
        const res = await fetch("/api/consultations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expertProfileId: expert.id,
            type: isFreeTrial ? "FIVE_MIN_FREE" : "PAID",
            appointmentId: appointmentId || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to initiate consultation");
        }

        if (isCancelled) return;

        setConsultationId(data.consultationId);
        setRemainingSecs(data.maxAllowedSecs || (isFreeTrial ? 300 : 1800));

        // Join 100ms room using token
        try {
          await hmsActions.join({
            authToken: data.token,
            userName: "Patient",
          });
        } catch (joinErr: unknown) {
          console.error("100ms Join Error:", joinErr);
          if (
            joinErr instanceof Error &&
            (joinErr.name === "NotAllowedError" || joinErr.message.includes("permission"))
          ) {
            setDevicePermissionError(true);
          } else {
            throw joinErr;
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Could not connect to consultation room"
          );
        }
      }
    }

    initSession();

    return () => {
      isCancelled = true;
    };
  }, [expert.id, isFreeTrial, appointmentId, hmsActions]);

  // 2. Countdown timer and periodic Heartbeat
  useEffect(() => {
    if (!consultationId) return;

    const timer = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          setIsHandoverPromptOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const heartbeatInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/consultations/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId }),
        });
        const data = await res.json();
        if (data.expired) {
          setIsHandoverPromptOpen(true);
        } else if (typeof data.remainingSecs === "number") {
          setRemainingSecs(data.remainingSecs);
        }
      } catch (err) {
        console.error("Heartbeat sync error:", err);
      }
    }, 20000);

    return () => {
      clearInterval(timer);
      clearInterval(heartbeatInterval);
    };
  }, [consultationId]);

  // 3. Clean End Call
  const handleEndCall = async () => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;

    try {
      if (isConnected) {
        await hmsActions.leave();
      }
    } catch (e) {
      console.error("HMS Leave error:", e);
    }

    if (consultationId) {
      try {
        await fetch("/api/consultations/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId }),
        });
      } catch (e) {
        console.error("End consultation API error:", e);
      }
    }

    setIsReviewOpen(true);
  };

  const handleReviewSubmit = async () => {
    setIsSubmittingReview(true);
    try {
      await fetch("/api/consultations/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertProfileId: expert.id,
          rating: reviewRating,
          comment: reviewComment,
          isAnonymous: true,
        }),
      });
    } catch (err) {
      console.error("Review submit error:", err);
    } finally {
      setIsSubmittingReview(false);
      onClose();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const remotePeers = peers.filter((p) => !p.isLocal);

  // Review Modal Post-Call
  if (isReviewOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl text-center"
        >
          <div className="mx-auto h-12 w-12 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center mb-4">
            <Star className="h-6 w-6 fill-current" />
          </div>
          <h3 className="text-lg font-bold text-foreground">How was your session?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Your review for {expert.fullName} helps other young people make informed decisions.
          </p>

          <div className="flex justify-center items-center gap-2 my-5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setReviewRating(star)}
                className="p-1 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-7 w-7 ${
                    star <= reviewRating
                      ? "text-amber-500 fill-amber-500"
                      : "text-zinc-600"
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share private, constructive feedback (optional)..."
            rows={3}
            className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none mb-4"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={onClose}
              disabled={isSubmittingReview}
            >
              Skip
            </Button>
            <Button
              className="flex-1 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleReviewSubmit}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden h-[90vh] max-h-[800px]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                {expert.fullName}
                <span className="text-xs bg-teal-500/20 text-teal-600 dark:text-teal-400 font-medium px-2 py-0.5 rounded-full border border-teal-500/30">
                  {expert.type === "PSYCHIATRIST" ? "Psychiatrist" : "MBBS Peer Supporter"}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">{expert.qualifications}</p>
            </div>
          </div>

          {/* Countdown & Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/80 border border-border/80 shadow-sm">
              <Clock
                className={`h-4 w-4 ${
                  remainingSecs < 60 ? "text-red-500 animate-bounce" : "text-primary"
                }`}
              />
              <span
                className={`text-sm font-mono font-bold ${
                  remainingSecs < 60 ? "text-red-500" : "text-foreground"
                }`}
              >
                {formatTime(remainingSecs)}
              </span>
              {isFreeTrial && (
                <span className="text-[10px] uppercase font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                  Free 5-Min Trial
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Video Canvas Stage */}
        <div className="relative flex-1 bg-zinc-950 p-4 overflow-hidden flex flex-col justify-center items-center">
          {errorMessage ? (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
              <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
              <h4 className="text-base font-bold text-foreground">Room Connection Error</h4>
              <p className="text-xs text-muted-foreground mt-2">{errorMessage}</p>
              <Button onClick={onClose} variant="outline" className="mt-5 text-xs">
                Close Room
              </Button>
            </div>
          ) : devicePermissionError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
              <h4 className="text-base font-bold text-foreground">Permission Denied</h4>
              <p className="text-xs text-muted-foreground mt-2">
                Camera or Microphone permission was blocked by your browser. Please allow device
                access in your browser address bar settings to continue the call.
              </p>
              <Button onClick={onClose} variant="outline" className="mt-5 text-xs">
                Dismiss
              </Button>
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm font-medium">Joining secure 100ms video room...</p>
              <p className="text-xs text-zinc-500">Establishing end-to-end media channel</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col gap-4">
              {/* Remote Peer Stream or Waiting state */}
              <div className="relative flex-1 w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                {remotePeers.length > 0 ? (
                  <PeerVideoTile peer={remotePeers[0]} isLocal={false} />
                ) : (
                  <div className="text-center p-6">
                    <div className="mx-auto h-20 w-20 rounded-full border border-teal-500/40 bg-teal-500/10 flex items-center justify-center text-teal-400 mb-3 animate-pulse">
                      <Users className="h-9 w-9" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Waiting for {expert.fullName} to join...
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      A notification has been sent. Your session timer only counts while active.
                    </p>
                  </div>
                )}

                {/* Picture-in-Picture Local Preview */}
                {localPeer && (
                  <div className="absolute bottom-4 right-4 h-32 w-48 sm:h-36 sm:w-56 rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-zinc-900 z-10">
                    <PeerVideoTile peer={localPeer} isLocal={true} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* End-of-trial Handover Overlay */}
          <AnimatePresence>
            {isHandoverPromptOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-background/95 backdrop-blur-md z-30 p-8 flex flex-col items-center justify-center text-center"
              >
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-foreground">
                  Free 5-Minute Consultation Completed
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mt-2">
                  Your introductory session has concluded safely. To continue your clinical conversation
                  with {expert.fullName}, select an extension package.
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
                    <div className="text-[11px] text-muted-foreground">Recommended</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-card text-left hover:border-primary cursor-pointer transition-all">
                    <div className="text-xs font-semibold text-primary">30 Minutes</div>
                    <div className="text-lg font-bold text-foreground mt-1">₹499</div>
                    <div className="text-[11px] text-muted-foreground">Complete session</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <Button variant="outline" onClick={handleEndCall}>
                    End Session
                  </Button>
                  <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                    <CreditCard className="h-4 w-4" />
                    Extend Session
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Clinical safety protocol: Tele-MANAS helpline 14416 is available 24x7.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Controls Bar */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            100ms WebRTC Encryption
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={isLocalAudioEnabled ? "secondary" : "destructive"}
              size="icon"
              onClick={() => hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled)}
              disabled={!isConnected}
              className="rounded-full h-11 w-11"
            >
              {isLocalAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              variant={isLocalVideoEnabled ? "secondary" : "destructive"}
              size="icon"
              onClick={() => hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled)}
              disabled={!isConnected}
              className="rounded-full h-11 w-11"
            >
              {isLocalVideoEnabled ? (
                <VideoIcon className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
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
            {remotePeers.length + (localPeer ? 1 : 0)} Participants Active
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Exported Wrapper with HMSRoomProvider
export function ConsultationRoomModal(props: ConsultationModalProps) {
  if (!props.isOpen) return null;

  return (
    <HMSRoomProvider>
      <ActiveRoomContent
        expert={props.expert}
        isFreeTrial={props.isFreeTrial ?? false}
        appointmentId={props.appointmentId}
        onClose={props.onClose}
      />
    </HMSRoomProvider>
  );
}
