"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  Video,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  EyeOff,
  UserX,
  FileText,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"VERIFICATIONS" | "REPORTS" | "FLAGGED">("VERIFICATIONS");
  const [verifications, setVerifications] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<{ messages: any[]; posts: any[] }>({
    messages: [],
    posts: [],
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVerifications = async () => {
    try {
      const res = await fetch("/api/admin/verifications");
      const data = await res.json();
      if (res.ok) setVerifications(data.verifications || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (res.ok) {
        setReports(data.reports || []);
        if (data.flaggedContent) setFlaggedContent(data.flaggedContent);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchVerifications(), fetchReports()]).finally(() => setLoading(false));
  }, []);

  const handleVerificationAction = async (verificationId: string, action: "APPROVED" | "REJECTED") => {
    try {
      setActionLoading(verificationId);
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, action }),
      });
      if (res.ok) {
        setVerifications((prev) => prev.filter((v) => v.id !== verificationId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportAction = async (reportId: string, action: "DISMISS" | "WARN" | "HIDE_CONTENT" | "SUSPEND_USER") => {
    try {
      setActionLoading(reportId);
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 mb-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              Administrative Governance
            </div>
            <h1 className="text-3xl font-extrabold text-foreground">Admin Operations & Moderation</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Indian Telemedicine Practice Guidelines & DPDP Act 2023 Compliance Panel
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("VERIFICATIONS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "VERIFICATIONS" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Credentials ({verifications.length})
            </button>
            <button
              onClick={() => setActiveTab("REPORTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "REPORTS" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reports & Crisis ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab("FLAGGED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "FLAGGED" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Flagged Content
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mt-8">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Loading governance console...</p>
            </div>
          ) : activeTab === "VERIFICATIONS" ? (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-500" />
                Practitioner Verification Requests
              </h2>

              {verifications.length === 0 ? (
                <Card className="p-8 text-center border-border">
                  <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-foreground">All Verifications Cleared</p>
                  <p className="text-xs text-muted-foreground mt-1">No pending medical registrations or student applications.</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {verifications.map((v) => (
                    <Card key={v.id} className="p-5 border-border">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-foreground">{v.expertProfile?.fullName}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              {v.expertProfile?.type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {v.expertProfile?.qualifications} · {v.expertProfile?.collegeOrHospital}
                          </p>
                          {v.expertProfile?.registrationNumber && (
                            <p className="text-xs font-mono text-zinc-400 mt-1">
                              Registration: {v.expertProfile?.registrationNumber} ({v.expertProfile?.medicalCouncil || "State Council"})
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Document Type: <span className="font-semibold text-foreground">{v.documentType}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-destructive hover:bg-destructive/10"
                            disabled={actionLoading === v.id}
                            onClick={() => handleVerificationAction(v.id, "REJECTED")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={actionLoading === v.id}
                            onClick={() => handleVerificationAction(v.id, "APPROVED")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve Practitioner
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "REPORTS" ? (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                User Reports & Crisis Triage
              </h2>

              {reports.length === 0 ? (
                <Card className="p-8 text-center border-border">
                  <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-foreground">Clean Safety Queue</p>
                  <p className="text-xs text-muted-foreground mt-1">No active reports or urgent crisis flags requiring intervention.</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reports.map((r) => (
                    <Card key={r.id} className="p-5 border-border">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-500">
                              {r.reason}
                            </span>
                            <span className="text-[11px] text-muted-foreground">Target: {r.targetType}</span>
                          </div>
                          <p className="text-xs text-foreground mt-2 leading-relaxed">{r.details}</p>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Reported User: <span className="font-semibold text-foreground">{r.reportedUser?.email || "Unknown"}</span>
                            {r.reportedUser?.isSuspended && (
                              <span className="ml-2 text-destructive font-semibold">(Suspended)</span>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={actionLoading === r.id}
                            onClick={() => handleReportAction(r.id, "DISMISS")}
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-amber-600"
                            disabled={actionLoading === r.id}
                            onClick={() => handleReportAction(r.id, "WARN")}
                          >
                            Warn User
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-destructive"
                            disabled={actionLoading === r.id}
                            onClick={() => handleReportAction(r.id, "HIDE_CONTENT")}
                          >
                            <EyeOff className="h-3.5 w-3.5 mr-1" />
                            Hide Item
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            disabled={actionLoading === r.id}
                            onClick={() => handleReportAction(r.id, "SUSPEND_USER")}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Suspend
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">Automatically Flagged Content</h2>
              <div className="space-y-3">
                {flaggedContent.posts.map((p) => (
                  <Card key={p.id} className="p-4 border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">Post: {p.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                        Flag: {p.moderationFlag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.content}</p>
                  </Card>
                ))}
                {flaggedContent.messages.map((m) => (
                  <Card key={m.id} className="p-4 border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">Peer Message</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                        Flag: {m.moderationFlag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.content}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
