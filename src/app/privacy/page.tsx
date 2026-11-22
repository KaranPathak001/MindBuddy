"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    try {
      setIsDeleting(true);
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
      });
      if (res.ok) {
        setDeletedSuccess(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to MindHaven
        </Link>

        <div className="border-b border-border pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            DPDP Act 2023 & Clinical Governance
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">Privacy Policy & Youth Data Protection</h1>
          <p className="text-xs text-muted-foreground mt-2">
            Last Updated: November 2026 · Compliant with India&apos;s Digital Personal Data Protection Act (DPDP) 2023
          </p>
        </div>

        <div className="mt-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-foreground mb-2">1. Overview & Anonymity in Peer Circles</h2>
            <p>
              MindHaven Circle peer interactions are designed with privacy-first architecture. In public spaces and
              peer chat rooms, fellow users can only see your chosen <code>displayName</code> and <code>avatarIndex</code>.
              Your real legal name, email address, phone number, and account identifiers are strictly shielded.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2">2. Special Provisions for Minors (DPDP Act 2023)</h2>
            <p>
              Under India&apos;s Digital Personal Data Protection Act 2023, personal data of individuals under 18 years
              of age receives heightened protection. MindHaven strictly enforces:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>No tracking or behavioral profiling for advertisement purposes.</li>
              <li>Automated blocking of phone numbers, social media handles, and personal contact vectors in peer chats.</li>
              <li>Parental or guardian advisory notices for professional clinical psychiatric interventions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2">3. End-to-End Media Encryption (Telemedicine)</h2>
            <p>
              MindHaven Connect video and audio consultations are conducted via peer-encrypted WebRTC channels powered by
              100ms. Live audio/video streams are ephemeral and never recorded or archived without explicit dual consent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2">4. Your Right to Erasure (Delete Account & Data)</h2>
            <p>
              In accordance with Section 12 of the DPDP Act 2023, you retain the permanent right to erasure of your personal
              data. Requesting deletion immediately and irrevocably anonymizes all mood entries, clears chat transcripts,
              and permanently deletes your account credentials.
            </p>

            <div className="mt-4 p-5 rounded-2xl border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <Trash2 className="h-4 w-4" /> Permanent Data Erasure
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This action is immediate and non-reversible.
              </p>

              {deletedSuccess ? (
                <div className="mt-3 text-xs font-semibold text-emerald-500">
                  Account and data deleted. Redirecting to home...
                </div>
              ) : deleteConfirmOpen ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-foreground">
                    Type <strong>DELETE</strong> below to confirm deletion of your data:
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full max-w-xs text-xs px-3 py-2 rounded-xl border border-border bg-background"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteInput !== "DELETE" || isDeleting}
                      onClick={handleDeleteAccount}
                      className="text-xs"
                    >
                      {isDeleting ? "Erasing Data..." : "Confirm & Delete Everything"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="mt-3 text-xs"
                >
                  Delete My Account and Data
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
