"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Sparkles,
  MessageCircle,
  Shield,
  Heart,
  Send,
  UserCheck,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Phone,
  Video,
  AlertCircle,
  Flag,
  Lock,
  ThumbsUp,
  MessageSquare,
  LogOut,
  ChevronRight,
  Inbox,
  SendHorizontal,
  Clock,
  MoreVertical,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { getPusherClient } from "@/lib/pusher-client";

interface PeerProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarIndex: number;
  bio?: string;
  interests: string[];
  preferredLanguage: string;
  conversationPreference: string;
  matchScore?: number;
  sharedInterests?: string[];
  requestStatus?: "NONE" | "OUTGOING_PENDING" | "INCOMING_PENDING";
  requestId?: string | null;
}

interface CircleItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  memberCount: number;
  postCount: number;
  isMember: boolean;
}

interface CirclePostItem {
  id: string;
  circleId: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  createdAt: string;
  author: {
    displayName: string;
    avatarIndex: number;
  };
}

interface CircleCommentItem {
  id: string;
  postId: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  author: {
    displayName: string;
    avatarIndex: number;
  };
}

const INTEREST_TAGS = [
  "Exam Anxiety",
  "College Life",
  "Hostel Living",
  "Career & Jobs",
  "Mindfulness",
  "Relationships",
  "Late Night Venting",
  "Daily Motivation",
  "Fitness & Health",
  "Coding & Tech",
  "Reading & Arts",
];

export default function CirclePage() {
  const { user, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"DISCOVER" | "DAILY" | "REQUESTS" | "CHATS" | "GROUPS">("DISCOVER");

  // Profile setup state
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [myProfile, setMyProfile] = useState<PeerProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["College Life", "Mindfulness"]);
  const [preferredLang, setPreferredLang] = useState("English");
  const [convPreference, setConvPreference] = useState("FRIENDS");

  // Peers & Daily match
  const [peers, setPeers] = useState<PeerProfile[]>([]);
  const [dailyMatch, setDailyMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Connection Requests state
  const [requestBox, setRequestBox] = useState<"incoming" | "outgoing">("incoming");
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [reqActionLoading, setReqActionLoading] = useState<string | null>(null);

  // Chat conversation state
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isPeerTyping, setIsPeerTyping] = useState(false);

  // Circle Groups state
  const [circles, setCircles] = useState<CircleItem[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<CircleItem | null>(null);
  const [circlePosts, setCirclePosts] = useState<CirclePostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostAnonymous, setNewPostAnonymous] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [activePostComments, setActivePostComments] = useState<CirclePostItem | null>(null);
  const [commentsList, setCommentsList] = useState<CircleCommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Action / Feedback alerts
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reporting & Blocking modal
  const [reportingTarget, setReportingTarget] = useState<{
    type: "USER" | "MESSAGE" | "POST";
    id: string;
    reportedId?: string;
    title: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const checkMyProfile = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/circle/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setMyProfile(data.profile);
          setDisplayName(data.profile.displayName);
          setAvatarIndex(data.profile.avatarIndex);
          setBio(data.profile.bio || "");
          setSelectedInterests(data.profile.interests || []);
          setPreferredLang(data.profile.preferredLanguage);
          setConvPreference(data.profile.conversationPreference);
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      }
    } catch {
      setHasProfile(false);
    }
  }, [user]);

  const fetchPeers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/circle/discover");
      if (res.ok) {
        const data = await res.json();
        setPeers(data.peers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailyMatch = useCallback(async () => {
    try {
      const res = await fetch("/api/circle/daily-match");
      if (res.ok) {
        const data = await res.json();
        setDailyMatch(data.dailyMatch);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchCircles = useCallback(async () => {
    try {
      const res = await fetch("/api/circle/circles");
      if (res.ok) {
        const data = await res.json();
        setCircles(data.circles || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const [inRes, outRes] = await Promise.all([
        fetch("/api/circle/requests?box=incoming"),
        fetch("/api/circle/requests?box=outgoing"),
      ]);
      if (inRes.ok) {
        const inData = await inRes.json();
        setIncomingRequests(inData.requests || []);
      }
      if (outRes.ok) {
        const outData = await outRes.json();
        setOutgoingRequests(outData.requests || []);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/circle/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    checkMyProfile();
    fetchPeers();
    fetchDailyMatch();
    fetchCircles();
    if (user) {
      fetchRequests();
      fetchConversations();
    }
  }, [user, checkMyProfile, fetchPeers, fetchDailyMatch, fetchCircles, fetchRequests, fetchConversations]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("login");
      return;
    }

    try {
      const res = await fetch("/api/circle/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          avatarIndex,
          bio,
          interests: selectedInterests,
          preferredLanguage: preferredLang,
          conversationPreference: convPreference,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyProfile(data.profile);
        setHasProfile(true);
        setIsEditingProfile(false);
        showToast("success", "Anonymous peer profile updated!");
        fetchPeers();
      } else {
        showToast("error", data.error || "Failed to save profile");
      }
    } catch {
      showToast("error", "Error connecting to server");
    }
  };

  // Send Connection Request
  const handleSendConnectionRequest = async (receiverId: string) => {
    if (!user) {
      openAuthModal("login");
      return;
    }
    setReqActionLoading(receiverId);
    try {
      const res = await fetch("/api/circle/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", "Connection request sent!");
        fetchPeers();
        fetchRequests();
        if (dailyMatch && dailyMatch.peer.userId === receiverId) {
          fetchDailyMatch();
        }
      } else {
        showToast("error", data.error || "Failed to send request");
      }
    } catch {
      showToast("error", "Could not send connection request");
    } finally {
      setReqActionLoading(null);
    }
  };

  // Accept / Reject / Cancel Connection Request
  const handleRequestAction = async (requestId: string, action: "accept" | "reject" | "cancel") => {
    setReqActionLoading(requestId);
    try {
      const res = await fetch(`/api/circle/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || "Request updated successfully");
        fetchRequests();
        fetchPeers();
        if (action === "accept" && data.conversationId) {
          await fetchConversations();
          setActiveTab("CHATS");
        }
      } else {
        showToast("error", data.error || "Failed to update request");
      }
    } catch {
      showToast("error", "Error updating connection request");
    } finally {
      setReqActionLoading(null);
    }
  };

  // Peer Chat Messages & Real-Time Sync
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/circle/messages?conversationId=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // Subscribe to Pusher channel or fallback to 3-second polling for active conversation
  useEffect(() => {
    if (!activeConversation) return;

    const convId = activeConversation.id;
    const pusher = getPusherClient();

    if (pusher) {
      const channel = pusher.subscribe(`private-conversation-${convId}`);

      channel.bind("new-message", (data: { message: any }) => {
        if (data?.message) {
          setMessages((prev) => {
            // Avoid duplicate optimistic messages
            const withoutTemp = prev.filter(
              (m) =>
                m.id !== data.message.id &&
                !(m.id.startsWith("temp-") && m.content === data.message.content)
            );
            return [...withoutTemp, data.message];
          });
        }
      });

      channel.bind("client-typing", (data: { userId: string; isTyping: boolean }) => {
        if (data.userId !== user?.id) {
          setIsPeerTyping(data.isTyping);
        }
      });

      return () => {
        pusher.unsubscribe(`private-conversation-${convId}`);
      };
    } else {
      // 3-second live polling fallback when Pusher credentials are not provided
      const pollTimer = setInterval(() => {
        fetchMessages(convId);
      }, 3000);

      return () => clearInterval(pollTimer);
    }
  }, [activeConversation, user?.id, fetchMessages]);

  const handleSelectConversation = (conv: any) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistic UI append
    const tempMsg = {
      id: `temp-${Date.now()}`,
      content: messageText,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/circle/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          content: messageText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.crisisDetected && data.crisisAlert) {
          showToast("error", `${data.crisisAlert.helpline}: ${data.crisisAlert.message}`);
        }
        fetchMessages(activeConversation.id);
        fetchConversations();
      } else {
        showToast("error", data.error || "Message delivery failed");
      }
    } catch {
      showToast("error", "Failed to deliver message");
    }
  };

  // Circle Group Actions
  const handleToggleMembership = async (circle: CircleItem) => {
    if (!user) {
      openAuthModal("login");
      return;
    }
    const isJoining = !circle.isMember;
    try {
      const res = await fetch(`/api/circle/circles/${circle.id}/membership`, {
        method: isJoining ? "POST" : "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message);
        setCircles((prev) =>
          prev.map((c) =>
            c.id === circle.id
              ? {
                  ...c,
                  isMember: isJoining,
                  memberCount: isJoining ? c.memberCount + 1 : Math.max(0, c.memberCount - 1),
                }
              : c
          )
        );
        if (selectedCircle && selectedCircle.id === circle.id) {
          setSelectedCircle((prev) =>
            prev
              ? {
                  ...prev,
                  isMember: isJoining,
                  memberCount: isJoining ? prev.memberCount + 1 : Math.max(0, prev.memberCount - 1),
                }
              : null
          );
        }
      } else {
        showToast("error", data.error || "Could not update membership");
      }
    } catch {
      showToast("error", "Error updating circle membership");
    }
  };

  const handleOpenCircleFeed = async (circle: CircleItem) => {
    setSelectedCircle(circle);
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/circle/circles/${circle.id}/posts`);
      if (res.ok) {
        const data = await res.json();
        setCirclePosts(data.posts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircle || !newPostTitle.trim() || !newPostContent.trim()) return;

    setIsPosting(true);
    try {
      const res = await fetch(`/api/circle/circles/${selectedCircle.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          isAnonymous: newPostAnonymous,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.crisisDetected && data.crisisAlert) {
          showToast("error", `${data.crisisAlert.helpline}: ${data.crisisAlert.message}`);
        }
        showToast("success", "Post published to circle feed!");
        setNewPostTitle("");
        setNewPostContent("");
        setCirclePosts((prev) => [data.post, ...prev]);
        setCircles((prev) =>
          prev.map((c) => (c.id === selectedCircle.id ? { ...c, postCount: c.postCount + 1 } : c))
        );
      } else {
        showToast("error", data.error || "Failed to publish post");
      }
    } catch {
      showToast("error", "Error creating post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      openAuthModal("login");
      return;
    }
    try {
      const res = await fetch(`/api/circle/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCirclePosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  hasLiked: data.hasLiked,
                  likesCount: data.likesCount,
                }
              : p
          )
        );
      }
    } catch {
      // ignore
    }
  };

  const handleOpenComments = async (post: CirclePostItem) => {
    setActivePostComments(post);
    try {
      const res = await fetch(`/api/circle/posts/${post.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setCommentsList(data.comments || []);
      }
    } catch {
      // ignore
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePostComments || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/circle/posts/${activePostComments.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newCommentText.trim(),
          isAnonymous: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.crisisDetected && data.crisisAlert) {
          showToast("error", `${data.crisisAlert.helpline}: ${data.crisisAlert.message}`);
        }
        setCommentsList((prev) => [...prev, data.comment]);
        setNewCommentText("");
        setCirclePosts((prev) =>
          prev.map((p) =>
            p.id === activePostComments.id ? { ...p, commentsCount: p.commentsCount + 1 } : p
          )
        );
      } else {
        showToast("error", data.error || "Could not post comment");
      }
    } catch {
      showToast("error", "Error posting comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Block & Report handlers
  const handleBlockUser = async (userIdToBlock: string) => {
    if (!confirm("Are you sure you want to block this user? You will no longer see each other or be matched.")) {
      return;
    }
    try {
      const res = await fetch("/api/circle/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: userIdToBlock }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message);
        fetchPeers();
        fetchRequests();
        fetchConversations();
        setActiveConversation(null);
      } else {
        showToast("error", data.error || "Failed to block user");
      }
    } catch {
      showToast("error", "Error processing block");
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingTarget || !reportReason.trim()) return;

    setIsSubmittingReport(true);
    try {
      const res = await fetch("/api/circle/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: reportingTarget.type,
          targetId: reportingTarget.id,
          reportedId: reportingTarget.reportedId || null,
          reason: reportReason.trim(),
          details: reportDetails.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", "Thank you. Report received for review.");
        setReportingTarget(null);
        setReportReason("");
        setReportDetails("");
      } else {
        showToast("error", data.error || "Failed to submit report");
      }
    } catch {
      showToast("error", "Error submitting report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const toggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(selectedInterests.filter((t) => t !== tag));
    } else {
      setSelectedInterests([...selectedInterests, tag]);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Toast Feedback */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              actionMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 backdrop-blur-md"
            }`}
          >
            {actionMessage.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {actionMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <section className="border-b border-border/40 bg-gradient-to-b from-violet-500/10 via-background to-background py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Persistent Crisis & Professional Care Banner */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2.5 text-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                <strong>Safety Notice:</strong> Peers are not therapists or doctors. In crisis or urgent distress, call <strong>Tele-MANAS at 14416</strong> (24x7 Free).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/connect"
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Consult a Verified Professional →
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 mb-2">
                <Heart className="h-3.5 w-3.5" />
                Empathetic Youth Support
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                MindHaven <span className="text-violet-600 dark:text-violet-400">Circle</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                Safe, pseudonymous peer support. Connect one-on-one with verified consent or explore shared interest circles.
              </p>
            </div>

            {/* Profile Pill */}
            {hasProfile && myProfile && !isEditingProfile ? (
              <div className="flex items-center gap-3 p-2 px-3 rounded-2xl bg-card border border-border shadow-sm">
                <div className="h-10 w-10 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center">
                  {myProfile.displayName[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{myProfile.displayName}</div>
                  <div className="text-[10px] text-muted-foreground">Anonymous Identity</div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditingProfile(true)}>
                  Edit
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab("DISCOVER")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "DISCOVER" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Find Companions
          </button>
          <button
            onClick={() => setActiveTab("DAILY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "DAILY" ? "bg-teal-500/15 text-teal-600 dark:text-teal-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Daily Match
          </button>
          <button
            onClick={() => setActiveTab("REQUESTS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all relative ${
              activeTab === "REQUESTS" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Inbox className="h-4 w-4" />
            Requests
            {incomingRequests.length > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("CHATS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "CHATS" ? "bg-violet-600/15 text-violet-600 dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Peer Chats
            {conversations.some((c) => c.unreadCount > 0) && (
              <span className="h-2 w-2 rounded-full bg-violet-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("GROUPS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "GROUPS" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="h-4 w-4" />
            Interest Circles
          </button>
        </div>

        {/* Tab 1: Discover Companions */}
        {activeTab === "DISCOVER" && (
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Finding thoughtful peers...</span>
              </div>
            ) : peers.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-foreground">No available peers right now</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  New youth companions join daily. Ensure your profile is set to available or check back shortly.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {peers.map((peer) => (
                  <Card key={peer.id} className="border-border hover:border-violet-500/50 transition-all shadow-sm flex flex-col justify-between">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-lg">
                            {peer.displayName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-foreground">{peer.displayName}</h4>
                            <span className="text-[11px] text-muted-foreground">Speaks {peer.preferredLanguage}</span>
                          </div>
                        </div>
                        {peer.matchScore && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {peer.matchScore}% Match
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {peer.bio || "Available for thoughtful, supportive peer conversation."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {peer.interests.map((interest) => (
                          <span key={interest} className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-secondary-foreground font-medium">
                            {interest}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 pt-3 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setReportingTarget({
                                type: "USER",
                                id: peer.userId,
                                reportedId: peer.userId,
                                title: `Report user ${peer.displayName}`,
                              })
                            }
                            className="text-muted-foreground hover:text-rose-500 text-[11px] p-1"
                            title="Report User"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleBlockUser(peer.userId)}
                            className="text-muted-foreground hover:text-rose-500 text-[11px] p-1"
                            title="Block User"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {peer.requestStatus === "OUTGOING_PENDING" ? (
                          <Button size="sm" variant="secondary" disabled className="gap-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5" />
                            Request Pending
                          </Button>
                        ) : peer.requestStatus === "INCOMING_PENDING" ? (
                          <Button
                            size="sm"
                            onClick={() => peer.requestId && handleRequestAction(peer.requestId, "accept")}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept Request
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={reqActionLoading === peer.userId}
                            onClick={() => handleSendConnectionRequest(peer.userId)}
                            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Send Request
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Daily Match */}
        {activeTab === "DAILY" && (
          <div className="mt-6 max-w-xl mx-auto">
            {dailyMatch ? (
              <Card className="border-2 border-teal-500/30 bg-gradient-to-b from-teal-500/5 to-card shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-4">
                    <Sparkles className="h-3.5 w-3.5" />
                    Today&apos;s Curated Companion
                  </div>

                  <div className="mx-auto h-20 w-20 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-extrabold text-2xl flex items-center justify-center border-2 border-teal-500/40">
                    {dailyMatch.peer.displayName[0]?.toUpperCase()}
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-foreground">{dailyMatch.peer.displayName}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Available for meaningful conversation</p>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    &ldquo;{dailyMatch.peer.bio || "Looking to chat, listen, and share sincere reflections."}&rdquo;
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {dailyMatch.peer.interests?.map((item: string) => (
                      <span key={item} className="px-2.5 py-1 rounded-lg text-xs bg-muted font-medium">
                        {item}
                      </span>
                    ))}
                  </div>

                  {dailyMatch.sharedReasons?.length > 0 && (
                    <div className="mt-6 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-700 dark:text-teal-300 text-left space-y-1">
                      <div className="font-semibold text-[11px] uppercase tracking-wider">Why you two match:</div>
                      {dailyMatch.sharedReasons.map((r: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-teal-500 flex-shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 flex justify-center gap-3">
                    {dailyMatch.requestStatus === "PENDING" ? (
                      <Button size="lg" variant="secondary" disabled className="gap-2">
                        <Clock className="h-4 w-4" />
                        {dailyMatch.isSender ? "Request Awaiting Response" : "Respond in Requests Tab"}
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        disabled={reqActionLoading === dailyMatch.peer.userId}
                        onClick={() => handleSendConnectionRequest(dailyMatch.peer.userId)}
                        className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <UserPlus className="h-4 w-4" />
                        Send Connection Request
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center border-dashed border-border">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-foreground">No daily companion available today</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  We check compatibility based on your interests and preferences. Check back tomorrow or browse Find Companions.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Tab 3: Connection Requests Inbox / Outbox */}
        {activeTab === "REQUESTS" && (
          <div className="mt-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={requestBox === "incoming" ? "default" : "outline"}
                  onClick={() => setRequestBox("incoming")}
                  className="gap-2 text-xs"
                >
                  <Inbox className="h-3.5 w-3.5" />
                  Received ({incomingRequests.length})
                </Button>
                <Button
                  size="sm"
                  variant={requestBox === "outgoing" ? "default" : "outline"}
                  onClick={() => setRequestBox("outgoing")}
                  className="gap-2 text-xs"
                >
                  <SendHorizontal className="h-3.5 w-3.5" />
                  Sent ({outgoingRequests.length})
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={fetchRequests} className="h-8 gap-1 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>

            {requestBox === "incoming" ? (
              incomingRequests.length === 0 ? (
                <Card className="p-10 text-center border-dashed border-border">
                  <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No pending incoming connection requests</p>
                  <p className="text-xs text-muted-foreground mt-1">When peers send you a connection request, you can choose to accept here.</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {incomingRequests.map((req) => (
                    <Card key={req.id} className="p-4 border-border flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center">
                          {req.peer?.displayName[0]?.toUpperCase() || "P"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">{req.peer?.displayName}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{req.peer?.bio || "Wants to connect with you in Circle."}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">Speaks {req.peer?.preferredLanguage}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={reqActionLoading === req.id}
                          onClick={() => handleRequestAction(req.id, "reject")}
                          variant="ghost"
                          className="h-8 text-xs text-muted-foreground hover:text-rose-500"
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          disabled={reqActionLoading === req.id}
                          onClick={() => handleRequestAction(req.id, "accept")}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : outgoingRequests.length === 0 ? (
              <Card className="p-10 text-center border-dashed border-border">
                <SendHorizontal className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No outgoing connection requests sent</p>
                <p className="text-xs text-muted-foreground mt-1">Explore Find Companions to connect with compatible peers.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {outgoingRequests.map((req) => (
                  <Card key={req.id} className="p-4 border-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center">
                        {req.peer?.displayName[0]?.toUpperCase() || "P"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{req.peer?.displayName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              req.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600"
                                : req.status === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    {req.status === "PENDING" && (
                      <Button
                        size="sm"
                        disabled={reqActionLoading === req.id}
                        onClick={() => handleRequestAction(req.id, "cancel")}
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground hover:text-rose-500"
                      >
                        Cancel Request
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Peer Chats */}
        {activeTab === "CHATS" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[520px]">
            {/* Conversations list sidebar */}
            <Card className="p-4 border-border flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground mb-3 flex items-center justify-between">
                  <span>Connected Conversations</span>
                  <span className="text-xs text-muted-foreground font-normal">{conversations.length} total</span>
                </h4>

                {conversations.length === 0 ? (
                  <div className="text-center py-10 px-2 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">No active conversations yet</p>
                    <p className="text-[11px] mt-1">Send a connection request to a peer. Once accepted, chat appears here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => {
                      const isActive = activeConversation?.id === conv.id;
                      return (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isActive
                              ? "bg-violet-500/10 border-violet-500/40 text-foreground"
                              : "hover:bg-muted/50 border-border text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="h-9 w-9 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                              {conv.peer?.displayName[0]?.toUpperCase() || "P"}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-semibold text-xs truncate">{conv.peer?.displayName || "Anonymous Peer"}</div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {conv.lastMessage?.content || "No messages yet"}
                              </p>
                            </div>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="h-5 min-w-5 px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border mt-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>Mutual consent enforced. Pseudonymous only.</span>
              </div>
            </Card>

            {/* Chat Messages Stage */}
            <Card className="md:col-span-2 border-border flex flex-col overflow-hidden">
              {activeConversation ? (
                <>
                  <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-xs">
                        {activeConversation.peer?.displayName[0]?.toUpperCase() || "P"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {activeConversation.peer?.displayName || "Anonymous Peer"}
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="text-[10px] text-muted-foreground">End-to-end pseudonymous session</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setReportingTarget({
                            type: "USER",
                            id: activeConversation.peer?.userId,
                            reportedId: activeConversation.peer?.userId,
                            title: `Report conversation with ${activeConversation.peer?.displayName}`,
                          })
                        }
                        className="text-xs text-muted-foreground hover:text-rose-500 gap-1"
                      >
                        <Flag className="h-3.5 w-3.5" /> Report
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBlockUser(activeConversation.peer?.userId)}
                        className="text-xs text-muted-foreground hover:text-rose-500 gap-1"
                      >
                        <Ban className="h-3.5 w-3.5" /> Block
                      </Button>
                    </div>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[360px] max-h-[460px] bg-card">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs py-12">
                        <Heart className="h-8 w-8 text-violet-400 mb-2" />
                        Say hello! All messages are private, respectful, and protected.
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                isMe
                                  ? "bg-violet-600 text-white rounded-br-none"
                                  : "bg-muted text-foreground rounded-bl-none"
                              }`}
                            >
                              <div>{msg.content}</div>
                              <div
                                className={`text-[9px] mt-1 ${
                                  isMe ? "text-violet-200 text-right" : "text-muted-foreground text-left"
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {isPeerTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-none px-3 py-1.5 text-xs flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" />
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.2s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.4s]" />
                          <span className="text-[11px] ml-1">Peer is typing...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Send Form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-background flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a supportive message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Button type="submit" size="icon" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                  <h3 className="font-semibold text-foreground text-sm">Select a Conversation</h3>
                  <p className="text-xs mt-1 max-w-xs">
                    Choose a peer from the left sidebar to open your secure peer chat history.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 5: Interest Circles (Groups) */}
        {activeTab === "GROUPS" && (
          <div className="mt-6">
            {!selectedCircle ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {circles.map((circle) => (
                  <Card key={circle.id} className="border-border hover:border-primary/50 transition-all flex flex-col justify-between">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-base text-foreground">{circle.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{circle.description}</p>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
                        <div className="flex items-center gap-3">
                          <span>{circle.memberCount} Members</span>
                          <span>&bull;</span>
                          <span>{circle.postCount} Posts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={circle.isMember ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleToggleMembership(circle)}
                            className="text-xs"
                          >
                            {circle.isMember ? "Joined" : "Join Circle"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenCircleFeed(circle)}
                            className="text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1"
                          >
                            Enter Feed <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div>
                {/* Circle Feed Top Bar */}
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCircle(null)} className="text-xs mb-1 -ml-2 text-muted-foreground">
                      &larr; Back to all Circles
                    </Button>
                    <h2 className="text-2xl font-bold text-foreground">{selectedCircle.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedCircle.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedCircle.isMember ? "secondary" : "default"}
                      size="sm"
                      onClick={() => handleToggleMembership(selectedCircle)}
                      className="text-xs"
                    >
                      {selectedCircle.isMember ? "Joined Circle" : "Join Circle"}
                    </Button>
                  </div>
                </div>

                {/* Circle Composer */}
                {selectedCircle.isMember ? (
                  <Card className="p-4 mb-6 border-border bg-card">
                    <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider mb-2">Publish a Post to Circle</h4>
                    <form onSubmit={handleCreatePost} className="space-y-3">
                      <input
                        type="text"
                        placeholder="Post Title (e.g. How do you handle study fatigue?)"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <textarea
                        placeholder="Write your honest thoughts, reflections or questions..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newPostAnonymous}
                            onChange={(e) => setNewPostAnonymous(e.target.checked)}
                            className="rounded border-border text-violet-600 focus:ring-violet-500"
                          />
                          Post anonymously as Kindred Peer
                        </label>
                        <Button type="submit" size="sm" disabled={isPosting} className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
                          {isPosting ? "Posting..." : "Share with Circle"}
                        </Button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border mb-6 text-center text-xs text-muted-foreground">
                    Join this circle to share posts and leave comments.
                  </div>
                )}

                {/* Posts Feed */}
                {loadingPosts ? (
                  <div className="text-center py-12 text-muted-foreground gap-2 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading circle discussions...</span>
                  </div>
                ) : circlePosts.length === 0 ? (
                  <Card className="p-12 text-center border-dashed border-border">
                    <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <h4 className="text-sm font-semibold text-foreground">No posts yet in this circle</h4>
                    <p className="text-xs text-muted-foreground mt-1">Be the first to share an inspiring thought or start a conversation.</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {circlePosts.map((post) => (
                      <Card key={post.id} className="p-5 border-border">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-xs">
                              {post.author.displayName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground">{post.author.displayName}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(post.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setReportingTarget({
                                type: "POST",
                                id: post.id,
                                title: `Report post: "${post.title}"`,
                              })
                            }
                            className="text-muted-foreground hover:text-rose-500 p-1"
                            title="Report post"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <h3 className="font-bold text-base text-foreground mt-3">{post.title}</h3>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                        <div className="mt-4 pt-3 border-t border-border flex items-center gap-4">
                          <button
                            onClick={() => handleToggleLike(post.id)}
                            className={`flex items-center gap-1.5 text-xs font-semibold transition-all ${
                              post.hasLiked ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <ThumbsUp className={`h-3.5 w-3.5 ${post.hasLiked ? "fill-current" : ""}`} />
                            <span>{post.likesCount} Helpful</span>
                          </button>
                          <button
                            onClick={() => handleOpenComments(post)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{post.commentsCount} Comments</span>
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments Drawer / Modal */}
      {activePostComments && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full max-h-[85vh] flex flex-col border-border bg-card shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground line-clamp-1">{activePostComments.title}</h3>
                <span className="text-[11px] text-muted-foreground">Comments & Reflections</span>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setActivePostComments(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {commentsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No comments yet. Share an encouraging reply!
                </div>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-muted/40 border border-border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground">{c.author.displayName}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="p-3 border-t border-border bg-background flex items-center gap-2">
              <input
                type="text"
                placeholder="Write a supportive reply..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Button type="submit" size="sm" disabled={isSubmittingComment} className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
                Reply
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Reporting Modal */}
      {reportingTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-border bg-card shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Flag className="h-4 w-4 text-rose-500" />
                Submit Report
              </h3>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setReportingTarget(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              MindHaven enforces strict youth safety guidelines. All flags are reviewed by human moderators.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Reason for Report</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="Harassment or bullying">Harassment or bullying</option>
                  <option value="Sharing personal contact / handles">Sharing personal contact / handles</option>
                  <option value="Inappropriate or sexual content">Inappropriate or sexual content</option>
                  <option value="Self-harm or crisis concern">Self-harm or crisis concern</option>
                  <option value="Spam or advertisement">Spam or advertisement</option>
                  <option value="Other violation">Other violation</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Additional Context (Optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  placeholder="Provide any details to help our moderation team understand..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setReportingTarget(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingReport} className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
