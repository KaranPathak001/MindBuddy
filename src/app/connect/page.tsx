"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  Clock,
  Video,
  Sparkles,
  GraduationCap,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConsultationRoomModal } from "@/components/consultation-room-modal";
import { useAuth } from "@/context/auth-context";

interface Expert {
  id: string;
  type: "STUDENT" | "PSYCHIATRIST";
  fullName: string;
  avatarUrl?: string | null;
  bio: string;
  collegeOrHospital: string;
  qualifications: string;
  registrationNumber?: string | null;
  medicalCouncil?: string | null;
  specializations: string[];
  languages: string[];
  yearsOfExperience: number;
  consultationPrice: number;
  isAvailableNow: boolean;
  averageRating: number;
  totalReviews: number;
  reviews?: any[];
  isDemo?: boolean;
}

interface AvailableSlot {
  time: string;
  scheduledAtUtc: string;
}

export default function ConnectPage() {
  const { user, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"ALL" | "PSYCHIATRIST" | "STUDENT">("ALL");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [freeTrialEligible, setFreeTrialEligible] = useState(true);

  // Active consultation modal
  const [activeConsultationExpert, setActiveConsultationExpert] = useState<Expert | null>(null);
  const [isTrialSession, setIsTrialSession] = useState(false);

  // Real Slot Booking State
  const [bookingExpert, setBookingExpert] = useState<Expert | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotUtc, setSelectedSlotUtc] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchExperts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.append("type", activeTab);
      if (availableNowOnly) params.append("availableNow", "true");
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/experts?${params.toString()}`);
      const data = await res.json();
      setExperts(data.experts || []);
    } catch (err) {
      console.error("Failed to fetch experts:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, availableNowOnly, searchQuery]);

  const checkTrialEligibility = useCallback(async () => {
    try {
      const res = await fetch("/api/consultations/free-trial-status");
      const data = await res.json();
      setFreeTrialEligible(data.eligible);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchExperts();
    checkTrialEligibility();
  }, [fetchExperts, checkTrialEligibility]);

  // Fetch slots whenever bookingExpert or bookingDate changes
  useEffect(() => {
    if (!bookingExpert || !bookingDate) {
      setAvailableSlots([]);
      setSelectedSlotUtc("");
      return;
    }

    async function loadSlots() {
      try {
        setLoadingSlots(true);
        const timezoneOffset = new Date().getTimezoneOffset();
        const res = await fetch(
          `/api/appointments/available-slots?expertProfileId=${bookingExpert?.id}&date=${bookingDate}&timezoneOffsetMinutes=${timezoneOffset}`
        );
        const data = await res.json();
        if (res.ok) {
          setAvailableSlots(data.availableSlots || []);
          if (data.availableSlots?.length > 0) {
            setSelectedSlotUtc(data.availableSlots[0].scheduledAtUtc);
          } else {
            setSelectedSlotUtc("");
          }
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [bookingExpert, bookingDate]);

  const handleStartConsultation = (expert: Expert, isTrial: boolean) => {
    if (!user) {
      openAuthModal("login");
      return;
    }
    setActiveConsultationExpert(expert);
    setIsTrialSession(isTrial);
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("login");
      return;
    }
    if (!bookingExpert || !selectedSlotUtc) return;

    try {
      setIsBookingSubmitting(true);
      setBookingError(null);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertProfileId: bookingExpert.id,
          scheduledAt: selectedSlotUtc,
          durationMinutes: 30,
          notes: bookingNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(true);
        setTimeout(() => {
          setBookingSuccess(false);
          setBookingExpert(null);
          setBookingDate("");
          setSelectedSlotUtc("");
          setBookingNotes("");
        }, 2000);
      } else {
        setBookingError(data.error || "Booking failed");
      }
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Error booking appointment");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Tele-Mental Health & Peer Guidance
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              MindHaven <span className="bg-gradient-to-r from-violet-500 to-teal-500 bg-clip-text text-transparent">Connect</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Connect in real-time with verified medical students for friendly peer guidance or consult licensed psychiatrists for clinical psychiatric care.
            </p>

            {/* Free Trial Banner */}
            {freeTrialEligible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/5 border border-teal-500/30 text-sm"
              >
                <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">Complimentary 5-Minute Intro Consultation Available</div>
                  <div className="text-xs text-muted-foreground">
                    New users receive a 1-time 5-minute free video/audio trial with any currently available verified expert.
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Main Marketplace Area */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "ALL" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Experts
            </button>
            <button
              onClick={() => setActiveTab("PSYCHIATRIST")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "PSYCHIATRIST"
                  ? "bg-teal-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              Licensed Psychiatrists
            </button>
            <button
              onClick={() => setActiveTab("STUDENT")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "STUDENT"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              MBBS Student Listeners
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={availableNowOnly}
                onChange={(e) => setAvailableNowOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Available Now
              </span>
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by expert name, hospital, specialization (e.g. Anxiety, Burnout)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Experts Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
              <p className="text-sm">Finding verified practitioners...</p>
            </div>
          ) : experts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-4 text-base font-semibold text-foreground">No Verified Practitioners Found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search criteria or checking back shortly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {experts.map((expert) => (
                <Card key={expert.id} className="border-border hover:border-primary/40 transition-all flex flex-col justify-between">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground">{expert.fullName}</h4>
                          {expert.isDemo && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-700 shrink-0">
                              Demo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{expert.qualifications}</p>
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-0.5">{expert.collegeOrHospital}</p>
                      </div>
                      {expert.isAvailableNow && (
                        <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          Live
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                      {expert.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {expert.specializations.slice(0, 3).map((spec, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                          {spec}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/60">
                      <div>
                        <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          {expert.averageRating}
                          <span className="text-[11px] text-muted-foreground font-normal">
                            ({expert.totalReviews})
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ₹{Math.round(expert.consultationPrice / 100)} / session
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {expert.isDemo ? (
                          <span className="text-[11px] px-3 py-1.5 rounded-lg bg-muted text-muted-foreground border border-border font-medium">
                            Demo – booking disabled
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBookingExpert(expert)}
                            className="text-xs"
                          >
                            Book Slot
                          </Button>
                        )}
                        {expert.isAvailableNow && (
                          <Button
                            size="sm"
                            onClick={() => handleStartConsultation(expert, freeTrialEligible)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1"
                          >
                            <Video className="h-3.5 w-3.5" />
                            {freeTrialEligible ? "5-Min Free" : "Call"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Real Slot Booking Modal */}
      <AnimatePresence>
        {bookingExpert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-foreground">Schedule Consultation</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Booking session with <span className="font-semibold text-foreground">{bookingExpert.fullName}</span>
              </p>

              {bookingSuccess ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 animate-bounce" />
                  <h4 className="mt-3 text-base font-semibold">Appointment Confirmed!</h4>
                  <p className="text-xs text-muted-foreground mt-1">Secure calendar invite & private room ready.</p>
                </div>
              ) : (
                <form onSubmit={handleBookAppointment} className="mt-4 space-y-4">
                  {bookingError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Select Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {bookingDate && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Select Available Slot (Your Timezone)
                      </label>
                      {loadingSlots ? (
                        <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Fetching expert availability...
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="mt-1 p-3 rounded-xl bg-muted/40 text-center text-xs text-muted-foreground">
                          No open slots available on this date. Please select another day.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 mt-2 max-h-36 overflow-y-auto pr-1">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot.scheduledAtUtc}
                              type="button"
                              onClick={() => setSelectedSlotUtc(slot.scheduledAtUtc)}
                              className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                                selectedSlotUtc === slot.scheduledAtUtc
                                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                  : "border-border bg-background text-foreground hover:border-primary/60"
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Note for Practitioner (Optional)</label>
                    <textarea
                      rows={2}
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Brief context (e.g., anxiety before exams)..."
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <span>Consultation Fee:</span>
                    <span className="font-bold text-foreground text-sm">
                      ₹{Math.round(bookingExpert.consultationPrice / 100)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-1/2"
                      onClick={() => setBookingExpert(null)}
                      disabled={isBookingSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="w-1/2 bg-teal-600 hover:bg-teal-700 text-white"
                      disabled={!selectedSlotUtc || isBookingSubmitting}
                    >
                      {isBookingSubmitting ? "Booking..." : "Confirm Booking"}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 100ms Video Consultation Room Modal */}
      {activeConsultationExpert && (
        <ConsultationRoomModal
          isOpen={!!activeConsultationExpert}
          onClose={() => {
            setActiveConsultationExpert(null);
            checkTrialEligibility();
          }}
          expert={activeConsultationExpert}
          isFreeTrial={isTrialSession}
        />
      )}
    </div>
  );
}
