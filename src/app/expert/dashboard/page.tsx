"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  UserCheck,
  Calendar,
  Clock,
  Video,
  DollarSign,
  Star,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  AlertTriangle,
  Loader2,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPusherClient } from "@/lib/pusher-client";
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

interface ExpertData {
  id: string;
  fullName: string;
  type: string;
  isAvailableNow: boolean;
  averageRating: number;
  totalReviews: number;
  verificationStatus: string;
}

interface DashboardStats {
  appointmentsToday: number;
  completedConsultations: number;
  totalEarningsPaise: number;
  averageRating: number;
}

interface ActiveConsultation {
  id: string;
  hmsRoomId: string;
  type: string;
  startedAt: string;
  clientName: string;
}

interface AppointmentItem {
  id: string;
  scheduledAt: string;
  status: string;
  durationMinutes: number;
  clientName: string;
}

function ExpertVideoTile({ peer, isLocal = false }: { peer: HMSPeer; isLocal?: boolean }) {
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
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[11px] text-zinc-200 border border-white/10">
        {isLocal ? "You (Practitioner)" : peer.name}
      </div>
    </div>
  );
}

function ExpertRoomModalInner({
  consultationId,
  clientName,
  onClose,
}: {
  consultationId: string;
  clientName: string;
  onClose: () => void;
}) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function joinRoom() {
      try {
        setLoading(true);
        const res = await fetch(`/api/consultations/${consultationId}/join-token`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to acquire join token");

        if (!active) return;

        await hmsActions.join({
          authToken: data.token,
          userName: "Practitioner",
        });
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Failed to join room");
      } finally {
        if (active) setLoading(false);
      }
    }

    joinRoom();

    return () => {
      active = false;
    };
  }, [consultationId, hmsActions]);

  const handleEndCall = async () => {
    try {
      if (isConnected) {
        await hmsActions.leave();
      }
      await fetch("/api/consultations/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId, endReason: "PRACTITIONER_CONCLUDED" }),
      });
    } catch (err) {
      console.error("End call error:", err);
    } finally {
      onClose();
    }
  };

  const remotePeers = peers.filter((p) => !p.isLocal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-5xl rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden h-[85vh] max-h-[750px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Active Tele-Consultation</h3>
            <p className="text-xs text-muted-foreground">Client: {clientName}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
            Live Host Session
          </span>
        </div>

        {/* Video Stage */}
        <div className="relative flex-1 bg-zinc-950 p-4 flex flex-col justify-center items-center">
          {error ? (
            <div className="text-center p-6">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
              <p className="text-sm text-foreground font-semibold">{error}</p>
              <Button onClick={onClose} variant="outline" className="mt-4 text-xs">
                Close Room
              </Button>
            </div>
          ) : loading || !isConnected ? (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Joining consultation room as Host...</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col gap-4">
              <div className="relative flex-1 w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                {remotePeers.length > 0 ? (
                  <ExpertVideoTile peer={remotePeers[0]} isLocal={false} />
                ) : (
                  <div className="text-center p-6">
                    <Users className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-300 font-semibold">Waiting for patient to connect...</p>
                  </div>
                )}

                {localPeer && (
                  <div className="absolute bottom-4 right-4 h-32 w-48 rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-zinc-900">
                    <ExpertVideoTile peer={localPeer} isLocal={true} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">100ms Host Room Controls</span>
          <div className="flex items-center gap-3">
            <Button
              variant={isLocalAudioEnabled ? "secondary" : "destructive"}
              size="icon"
              onClick={() => hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled)}
              disabled={!isConnected}
              className="rounded-full h-10 w-10"
            >
              {isLocalAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button
              variant={isLocalVideoEnabled ? "secondary" : "destructive"}
              size="icon"
              onClick={() => hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled)}
              disabled={!isConnected}
              className="rounded-full h-10 w-10"
            >
              {isLocalVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" onClick={handleEndCall} className="gap-2 rounded-full px-5 h-10 text-xs">
              <PhoneOff className="h-4 w-4" /> End Session
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">{remotePeers.length + (localPeer ? 1 : 0)} connected</span>
        </div>
      </div>
    </div>
  );
}

export default function ExpertDashboard() {
  const [expert, setExpert] = useState<ExpertData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeConsultations, setActiveConsultations] = useState<ActiveConsultation[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [activeCallSession, setActiveCallSession] = useState<{ id: string; clientName: string } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/expert/dashboard");
      const data = await res.json();
      if (res.ok) {
        setExpert(data.expert);
        setStats(data.stats);
        setActiveConsultations(data.activeConsultations || []);
        setUpcomingAppointments(data.upcomingAppointments || []);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const expertUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchDashboardData();

    // Setup Pusher real-time listening for incoming calls
    const pusher = getPusherClient();
    let channel: any = null;

    if (pusher && expert?.id) {
      channel = pusher.subscribe(`private-expert-${expert.id}`);
      channel.bind("incoming-call", () => {
        fetchDashboardData();
      });
      channel.bind("consultation-ended", () => {
        fetchDashboardData();
      });
    }

    // Polling fallback every 15s
    const interval = setInterval(fetchDashboardData, 15000);

    return () => {
      clearInterval(interval);
      if (channel && pusher) {
        pusher.unsubscribe(`private-expert-${expert?.id}`);
      }
    };
  }, [fetchDashboardData, expert?.id]);

  const toggleAvailability = async () => {
    if (!expert || togglingAvailability) return;
    setTogglingAvailability(true);
    try {
      const nextState = !expert.isAvailableNow;
      const res = await fetch("/api/expert/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailableNow: nextState }),
      });
      const data = await res.json();
      if (res.ok) {
        setExpert((prev) => (prev ? { ...prev, isAvailableNow: data.isAvailableNow } : null));
      }
    } catch (err) {
      console.error("Availability toggle error:", err);
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-background py-16 text-center">
        <h2 className="text-xl font-bold text-foreground">Practitioner Profile Not Found</h2>
        <p className="text-xs text-muted-foreground mt-2">
          Please register as a Medical Student or Psychiatrist to access this portal.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-2">
              <UserCheck className="h-3.5 w-3.5" />
              Practitioner Portal
            </div>
            <h1 className="text-3xl font-extrabold text-foreground">{expert.fullName}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {expert.type === "PSYCHIATRIST" ? "Consultant Psychiatrist" : "MBBS Peer Supporter"} · Verification:{" "}
              <span className="font-semibold text-emerald-500">{expert.verificationStatus}</span>
            </p>
          </div>

          {/* Real Instant Availability Toggle */}
          <div className="flex items-center gap-3 p-2 px-3 rounded-2xl border border-border bg-card">
            <span className="text-xs font-semibold text-foreground">Live Now for Instant Calls:</span>
            <button
              onClick={toggleAvailability}
              disabled={togglingAvailability}
              className="flex items-center gap-1.5 text-sm font-bold transition-opacity disabled:opacity-50"
            >
              {expert.isAvailableNow ? (
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Online
                </span>
              ) : (
                <span className="text-muted-foreground">Offline</span>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Upcoming Sessions <Calendar className="h-4 w-4 text-teal-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground">
              {stats?.appointmentsToday || 0} Today
            </div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Completed Consultations <Video className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground">
              {stats?.completedConsultations || 0}
            </div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Total Earnings <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-500">
              ₹{Math.floor((stats?.totalEarningsPaise || 0) / 100)}
            </div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Average Rating <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground">
              {stats?.averageRating || 5.0} / 5.0 ({expert.totalReviews} reviews)
            </div>
          </Card>
        </div>

        {/* Live Incoming Consultations */}
        {activeConsultations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-3 text-emerald-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              Incoming Patient Consultation Waiting
            </h2>
            <div className="space-y-3">
              {activeConsultations.map((c) => (
                <Card key={c.id} className="border-emerald-500/40 bg-emerald-500/5 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{c.clientName}</h4>
                      <p className="text-xs text-muted-foreground">
                        Type: {c.type === "FIVE_MIN_FREE" ? "Free 5-Min Trial" : "Paid Session"}
                      </p>
                    </div>
                    <Button
                      onClick={() => setActiveCallSession({ id: c.id, clientName: c.clientName })}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
                    >
                      <Video className="h-4 w-4" />
                      Join 100ms Room Now
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-teal-500" />
            Scheduled Appointments
          </h2>

          {upcomingAppointments.length === 0 ? (
            <Card className="p-8 text-center border-border">
              <p className="text-xs text-muted-foreground">No upcoming appointments scheduled yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => (
                <Card key={apt.id} className="border-border p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-base text-foreground">{apt.clientName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(apt.scheduledAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <span className="inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                        {apt.durationMinutes} Mins · Status: {apt.status}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 100ms Video Room Modal for Expert */}
      {activeCallSession && (
        <HMSRoomProvider>
          <ExpertRoomModalInner
            consultationId={activeCallSession.id}
            clientName={activeCallSession.clientName}
            onClose={() => {
              setActiveCallSession(null);
              fetchDashboardData();
            }}
          />
        </HMSRoomProvider>
      )}
    </div>
  );
}
