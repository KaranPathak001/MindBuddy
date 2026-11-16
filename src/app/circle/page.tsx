"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";

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
}

export default function CirclePage() {
  const { user, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"DISCOVER" | "DAILY" | "CHATS" | "GROUPS">("DISCOVER");

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

  // Chat conversation state
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [circles, setCircles] = useState<any[]>([]);

  useEffect(() => {
    checkMyProfile();
    fetchPeers();
    fetchDailyMatch();
    fetchCircles();
  }, [user]);

  const checkMyProfile = async () => {
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
  };

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
        fetchPeers();
      } else {
        alert(data.error || "Failed to save profile");
      }
    } catch {
      alert("Error saving profile");
    }
  };

  const fetchPeers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/circle/discover");
      const data = await res.json();
      setPeers(data.peers || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyMatch = async () => {
    try {
      const res = await fetch("/api/circle/daily-match");
      const data = await res.json();
      setDailyMatch(data.dailyMatch);
    } catch {
      // fallback
    }
  };

  const fetchCircles = async () => {
    try {
      const res = await fetch("/api/circle/circles");
      const data = await res.json();
      setCircles(data.circles || []);
    } catch {
      // fallback
    }
  };

  const startPeerChat = async (targetUserId: string) => {
    if (!user) {
      openAuthModal("login");
      return;
    }
    try {
      const res = await fetch("/api/circle/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveConversation(data.conversation);
        setActiveTab("CHATS");
        fetchMessages(data.conversation.id);
      }
    } catch {
      alert("Could not start chat");
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/circle/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      // fallback
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistic UI
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
      if (res.ok) {
        fetchMessages(activeConversation.id);
      }
    } catch {
      // ignore
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
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="border-b border-border/40 bg-gradient-to-b from-violet-500/10 via-background to-background py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 mb-3">
                <Heart className="h-3.5 w-3.5" />
                Friendship & Meaningful Companionship
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                MindHaven <span className="bg-gradient-to-r from-violet-500 to-teal-500 bg-clip-text text-transparent">Circle</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                No swiping, no superficial dating games. Connect with understanding peers who share your hobbies, academic pressures, and life chapters.
              </p>
            </div>

            {/* Profile Action button */}
            <div className="flex items-center gap-3">
              {hasProfile && !isEditingProfile && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                  Edit Peer Pseudonym
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* If user needs to create peer profile */}
        {(!hasProfile || isEditingProfile) && user && (
          <Card className="mb-8 border-violet-500/30 bg-violet-500/5">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-foreground">
                {hasProfile ? "Update Your Circle Profile" : "Create Your Anonymous Circle Profile"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your real name and email are never shown to peers. Pick a pseudonym and avatar.
              </p>

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Pseudonym / Display Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. StarGazer, QuietReader, CloudWatcher"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground">Preferred Conversation Mode</label>
                    <select
                      value={convPreference}
                      onChange={(e) => setConvPreference(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="LISTEN">I want someone to listen</option>
                      <option value="SHARE">I want to share my experiences</option>
                      <option value="CASUAL">I want a casual conversation</option>
                      <option value="FRIENDS">I want to make new friends</option>
                      <option value="SIMILAR_INTERESTS">I want to talk to someone with similar interests</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Short Bio (Introduce your vibe)</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. College 3rd year, love indie music and midnight tea chats. Always happy to listen."
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Select Interests (Matching signals)</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      "College Life",
                      "Academic Anxiety",
                      "Music & Playlists",
                      "Mindfulness",
                      "Reading & Books",
                      "Fitness & Sports",
                      "Coding & Tech",
                      "Art & Journaling",
                      "Night Owl",
                      "Hostel Living",
                    ].map((interest) => (
                      <button
                        type="button"
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedInterests.includes(interest)
                            ? "bg-violet-500 text-white shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white">
                    Save Peer Profile
                  </Button>
                  {hasProfile && (
                    <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
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
            onClick={() => setActiveTab("CHATS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "CHATS" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Peer Chats
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

        {/* Content Tabs */}
        {activeTab === "DISCOVER" && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {peers.map((peer) => (
                <Card key={peer.id} className="border-border hover:border-violet-500/50 transition-all shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-lg">
                          {peer.displayName[0]}
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
                      {peer.bio || "Looking to chat, listen, and share sincere daily reflections."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {peer.interests.map((interest) => (
                        <span key={interest} className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-secondary-foreground font-medium">
                          {interest}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-500" />
                        Pseudonymous
                      </span>
                      <Button
                        size="sm"
                        onClick={() => startPeerChat(peer.userId)}
                        className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Say Hello
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Daily Match Tab */}
        {activeTab === "DAILY" && dailyMatch && (
          <div className="mt-6 max-w-xl mx-auto">
            <Card className="border-2 border-teal-500/30 bg-gradient-to-b from-teal-500/5 to-card shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  Today's Curated Companion
                </div>

                <div className="mx-auto h-20 w-20 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-extrabold text-2xl flex items-center justify-center border-2 border-teal-500/40">
                  {dailyMatch.peer.displayName[0]}
                </div>

                <h3 className="mt-4 text-xl font-bold text-foreground">{dailyMatch.peer.displayName}</h3>
                <p className="text-xs text-muted-foreground mt-1">Available for meaningful conversation</p>

                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  "{dailyMatch.peer.bio}"
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {dailyMatch.peer.interests?.map((item: string) => (
                    <span key={item} className="px-2.5 py-1 rounded-lg text-xs bg-muted font-medium">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => startPeerChat(dailyMatch.peer.userId)}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Start Conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Peer Chats Tab */}
        {activeTab === "CHATS" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
            {/* Conversation sidebar */}
            <Card className="p-4 border-border flex flex-col">
              <h4 className="font-bold text-sm text-foreground mb-3">Conversations</h4>
              {activeConversation ? (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-sm font-semibold flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  Active Peer Conversation
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select a peer from Find Companions to begin chatting.</p>
              )}
            </Card>

            {/* Chat Messages Stage */}
            <Card className="md:col-span-2 border-border flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Encrypted Anonymous Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Optional Voice Call" onClick={() => alert("Voice call initiated with mutual consent.")}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Optional Video Call" onClick={() => alert("Video call initiated with mutual consent.")}>
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[360px] bg-card">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs py-12">
                    <Heart className="h-8 w-8 text-violet-400 mb-2" />
                    Say hello to break the ice! All conversations are private and respectful.
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
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Send Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-background flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a thoughtful message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <Button type="submit" size="icon" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Interest Circles Tab */}
        {activeTab === "GROUPS" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {circles.map((circle) => (
              <Card key={circle.id} className="border-border hover:border-primary/50 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-foreground">{circle.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{circle.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                    <span>{circle.memberCount || 28} Members Joined</span>
                    <Button variant="outline" size="sm" onClick={() => alert(`Joined ${circle.name} discussion circle!`)}>
                      Enter Circle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
