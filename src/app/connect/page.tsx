"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Star,
  Clock,
  ShieldCheck,
  Video,
  Calendar,
  Sparkles,
  GraduationCap,
  Stethoscope,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
}

export default function ConnectPage() {
  const { user, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"ALL" | "PSYCHIATRIST" | "STUDENT">("ALL");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [freeTrialEligible, setFreeTrialEligible] = useState(true);

  // Active consultation modal
  const [activeConsultationExpert, setActiveConsultationExpert] = useState<Expert | null>(null);
  const [isTrialSession, setIsTrialSession] = useState(false);

  // Booking Modal
  const [bookingExpert, setBookingExpert] = useState<Expert | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetchExperts();
    checkTrialEligibility();
  }, [activeTab, availableNowOnly, selectedLanguage]);

  const fetchExperts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.append("type", activeTab);
      if (availableNowOnly) params.append("availableNow", "true");
      if (selectedLanguage) params.append("language", selectedLanguage);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/experts?${params.toString()}`);
      const data = await res.json();
      setExperts(data.experts || []);
    } catch (err) {
      console.error("Failed to fetch experts:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkTrialEligibility = async () => {
    try {
      const res = await fetch("/api/consultations/free-trial-status");
      const data = await res.json();
      setFreeTrialEligible(data.eligible);
    } catch {
      // fallback
    }
  };

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
    if (!bookingExpert || !bookingDate) return;

    try {
      const scheduledDateTime = new Date(`${bookingDate}T${bookingTime}:00Z`).toISOString();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertProfileId: bookingExpert.id,
          scheduledAt: scheduledDateTime,
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
        }, 2000);
      } else {
        alert(data.error || "Booking failed");
      }
    } catch {
      alert("Error booking appointment");
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
              Tele-Mental Health & Peer Support
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

        {/* Search & Language Filter Bar */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by expert name, hospital, specialization (e.g. Anxiety, Burnout)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchExperts()}
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Marathi">Marathi</option>
              <option value="Bengali">Bengali</option>
            </select>
            <Button variant="secondary" onClick={fetchExperts}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Disclaimer Callout Box */}
        <div className="mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <span className="font-semibold">Telemedicine & Healthcare Transparency:</span> Medical students are verified MBBS trainees providing non-clinical emotional listening and health guidance. They do not diagnose or prescribe psychiatric medication. Clinical prescriptions and psychiatric diagnoses are strictly reserved for licensed, verified psychiatrists registered under National/State Medical Councils.
          </div>
        </div>

        {/* Expert Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Discovering verified practitioners...</p>
            </div>
          ) : experts.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border p-8">
              <Info className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-base font-semibold">No experts match your current filters</h3>
              <p className="text-sm text-muted-foreground mt-1">Try clearing your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {experts.map((expert) => {
                const isPsych = expert.type === "PSYCHIATRIST";
                const priceRs = Math.round(expert.consultationPrice / 100);

                return (
                  <Card key={expert.id} className="relative overflow-hidden border border-border hover:border-primary/50 transition-all shadow-sm">
                    {/* Status Top Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      {expert.isAvailableNow ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Online Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-muted-foreground bg-muted">
                          Next Slot Tomorrow
                        </span>
                      )}
                    </div>

                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-primary/10 border border-border">
                            {expert.avatarUrl ? (
                              <img src={expert.avatarUrl} alt={expert.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center font-bold text-xl text-primary">
                                {expert.fullName[0]}
                              </div>
                            )}
                          </div>
                          {isPsych ? (
                            <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full p-1" title="Licensed Psychiatrist">
                              <Stethoscope className="h-3 w-3" />
                            </div>
                          ) : (
                            <div className="absolute -bottom-1 -right-1 bg-violet-500 text-white rounded-full p-1" title="MBBS Student">
                              <GraduationCap className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 pr-14">
                          <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                            {expert.fullName}
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          </h3>
                          <p className="text-xs font-medium text-muted-foreground">{expert.qualifications}</p>
                          <p className="text-xs text-muted-foreground/80 mt-0.5">{expert.collegeOrHospital}</p>
                          {isPsych && expert.registrationNumber && (
                            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                              Reg: {expert.registrationNumber} ({expert.medicalCouncil})
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="mt-4 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {expert.bio}
                      </p>

                      {/* Specializations & Languages */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {expert.specializations.map((spec) => (
                          <span key={spec} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground">
                            {spec}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-foreground">{expert.averageRating.toFixed(1)}</span>
                          <span>({expert.totalReviews} reviews)</span>
                        </div>
                        <div>
                          Exp: <span className="font-medium text-foreground">{expert.yearsOfExperience} yrs</span>
                        </div>
                        <div>
                          Speaks: <span className="font-medium text-foreground">{expert.languages.join(", ")}</span>
                        </div>
                      </div>

                      {/* Price & Action Buttons */}
                      <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-border/80">
                        <div>
                          <div className="text-[11px] text-muted-foreground">Standard Session</div>
                          <div className="text-lg font-bold text-foreground">
                            ₹{priceRs}
                            <span className="text-xs font-normal text-muted-foreground"> / 30m</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBookingExpert(expert)}
                            className="gap-1.5"
                          >
                            <Calendar className="h-4 w-4" />
                            Book Slot
                          </Button>

                          {expert.isAvailableNow && (
                            <>
                              {freeTrialEligible ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStartConsultation(expert, true)}
                                  className="gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white"
                                >
                                  <Sparkles className="h-4 w-4" />
                                  5-Min Free Call
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStartConsultation(expert, false)}
                                  className="gap-1.5"
                                >
                                  <Video className="h-4 w-4" />
                                  Call Now
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Appointment Booking Modal */}
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
                  <p className="text-xs text-muted-foreground mt-1">Calendar invite & private video room ready.</p>
                </div>
              ) : (
                <form onSubmit={handleBookAppointment} className="mt-4 space-y-4">
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

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Select Time Slot</label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="10:00">10:00 AM - 10:30 AM</option>
                      <option value="11:30">11:30 AM - 12:00 PM</option>
                      <option value="14:00">02:00 PM - 02:30 PM</option>
                      <option value="16:00">04:00 PM - 04:30 PM</option>
                      <option value="18:30">06:30 PM - 07:00 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Note for the Expert (Optional)</label>
                    <textarea
                      rows={3}
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Share brief context about what you'd like to discuss..."
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <span>Session Fee:</span>
                    <span className="font-bold text-foreground text-sm">₹{Math.round(bookingExpert.consultationPrice / 100)}</span>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <Button type="button" variant="outline" className="w-1/2" onClick={() => setBookingExpert(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="w-1/2">
                      Confirm Booking
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
