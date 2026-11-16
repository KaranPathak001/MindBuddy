"use client";

import React, { useState } from "react";
import {
  UserCheck,
  Calendar,
  Clock,
  Video,
  DollarSign,
  Star,
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExpertDashboard() {
  const [isAvailableNow, setIsAvailableNow] = useState(true);

  const appointments = [
    {
      id: "apt-101",
      clientName: "Anonymous User (A.K.)",
      scheduledAt: "Today, 4:00 PM - 4:30 PM",
      type: "Paid Follow-up (30m)",
      status: "Upcoming",
    },
    {
      id: "apt-102",
      clientName: "Anonymous User (P.R.)",
      scheduledAt: "Tomorrow, 11:00 AM - 11:30 AM",
      type: "Clinical Assessment",
      status: "Confirmed",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-2">
              <UserCheck className="h-3.5 w-3.5" />
              Practitioner Portal
            </div>
            <h1 className="text-3xl font-extrabold text-foreground">Practitioner Console</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage tele-consultations, slot availability, and patient follow-ups
            </p>
          </div>

          {/* Instant Availability Toggle */}
          <div className="flex items-center gap-3 p-2 rounded-2xl border border-border bg-card">
            <span className="text-xs font-semibold text-foreground">Live Now for Instant Calls:</span>
            <button
              onClick={() => setIsAvailableNow(!isAvailableNow)}
              className="flex items-center gap-1 text-sm font-bold"
            >
              {isAvailableNow ? (
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

        {/* Overview Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Upcoming Sessions <Calendar className="h-4 w-4 text-teal-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground">2 Today</div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Completed Consultations <Video className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground">84</div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Total Earnings <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-500">₹42,500</div>
          </Card>

          <Card className="p-4 border-border">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              Average Rating <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground">4.92 / 5.0</div>
          </Card>
        </div>

        {/* Appointments Table */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-teal-500" />
            Upcoming Scheduled Appointments
          </h2>

          <div className="space-y-4">
            {appointments.map((apt) => (
              <Card key={apt.id} className="border-border p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{apt.clientName}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.scheduledAt}</p>
                    <span className="inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                      {apt.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm">
                      Reschedule
                    </Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                      <Video className="h-4 w-4" />
                      Enter 100ms Room
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
