"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  UserCheck,
  Stethoscope,
  Video,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<any>({
    totalUsers: 1240,
    activeExperts: 18,
    totalConsultations: 340,
    pendingVerifications: 4,
    totalReports: 2,
    totalRevenue: 245000,
  });

  const [verifications, setVerifications] = useState<any[]>([
    {
      id: "v-1",
      name: "Siddharth Saxena",
      type: "PSYCHIATRIST",
      qualifications: "MBBS, MD Psychiatry",
      council: "Maharashtra Medical Council (MMC/2018/8931)",
      docType: "Medical Registration Certificate & Degree",
      date: "2026-11-15",
    },
    {
      id: "v-2",
      name: "Meera Krishnan",
      type: "STUDENT",
      qualifications: "3rd Year MBBS Student",
      council: "Madras Medical College (Student ID #MMC-23-412)",
      docType: "College Enrollment & ID Card",
      date: "2026-11-14",
    },
  ]);

  const [reports, setReports] = useState<any[]>([
    {
      id: "rep-1",
      type: "POST",
      reason: "Hostile language in study group",
      reporter: "PseudonymUser12",
      date: "2026-11-15",
    },
  ]);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) setMetrics(data.metrics);
      })
      .catch(() => {});
  }, []);

  const handleAction = (id: string, action: "APPROVED" | "REJECTED") => {
    setVerifications(verifications.filter((v) => v.id !== id));
    alert(`Verification ${action.toLowerCase()} successfully.`);
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 mb-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              Administrative Governance
            </div>
            <h1 className="text-3xl font-extrabold text-foreground">Admin Operations & Moderation</h1>
          </div>
          <div className="text-xs text-muted-foreground">
            Telemedicine Compliance & Telecommunications Act Monitoring
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Total Platform Users <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground">{metrics.totalUsers}</div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Verified Experts <UserCheck className="h-4 w-4 text-teal-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-teal-500">{metrics.activeExperts}</div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Total Consultations <Video className="h-4 w-4 text-violet-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-violet-500">{metrics.totalConsultations}</div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Total Platform Revenue <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-500">₹{metrics.totalRevenue}</div>
          </Card>
        </div>

        {/* Verification Queue Section */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Stethoscope className="h-5 w-5 text-teal-500" />
            Medical & Clinical Verification Queue ({verifications.length} Pending)
          </h2>

          <div className="space-y-4">
            {verifications.map((item) => (
              <Card key={item.id} className="border-border p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground">{item.name}</h4>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.type === "PSYCHIATRIST" ? "bg-teal-500/20 text-teal-600 dark:text-teal-400" : "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Qualifications: {item.qualifications}</p>
                    <p className="text-xs text-muted-foreground">Council Details: {item.council}</p>
                    <p className="text-[11px] text-primary mt-1 flex items-center gap-1 font-mono">
                      <FileText className="h-3 w-3" /> Proof Document: {item.docType}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                      onClick={() => handleAction(item.id, "REJECTED")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleAction(item.id, "APPROVED")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve & Verify
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Safety & Moderation Reports */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Safety Flags & Moderation Queue
          </h2>

          <div className="space-y-4">
            {reports.map((rep) => (
              <Card key={rep.id} className="border-border p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Flagged Reason: {rep.reason}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Reported Target: {rep.type} | Reporter: {rep.reporter} | Date: {rep.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setReports([])}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setReports([])}>
                      Take Down & Warn User
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
