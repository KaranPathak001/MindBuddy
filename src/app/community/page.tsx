"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Shield, Flag, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const INITIAL_POSTS = [
  {
    id: "post-1",
    author: "QuietReader",
    content: "Finals week left me completely depleted, but spending 15 minutes sitting outside listening to the evening breeze helped reset my heart rate. One hour at a time.",
    timeAgo: "2 hours ago",
    likes: 12,
    replies: 2,
  },
  {
    id: "post-2",
    author: "CedarFern",
    content: "Reminder to anyone struggling with hostel living: it takes months to feel settled in an unfamiliar environment. Don't be too hard on yourself for feeling out of place initially.",
    timeAgo: "4 hours ago",
    likes: 24,
    replies: 5,
  },
];

export default function CommunityPage() {
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState(INITIAL_POSTS);

  const submitPost = () => {
    if (!newPost.trim()) return;
    setPosts([
      {
        id: `post-${Date.now()}`,
        author: "ThoughtfulMember",
        content: newPost.trim(),
        timeAgo: "Just now",
        likes: 1,
        replies: 0,
      },
      ...posts,
    ]);
    setNewPost("");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Community Sanctuary
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          A respectful, moderated forum for young people to share honest daily reflections.
        </p>
      </div>

      {/* Composer Card */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Posting anonymously</span>
          <span className="flex items-center gap-1 text-[11px]">
            <Shield className="h-3 w-3 text-emerald-500" /> Moderated board
          </span>
        </div>
        <textarea
          rows={3}
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share an honest reflection, realization, or quiet struggle..."
          className="w-full rounded-xl border border-border bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submitPost} disabled={!newPost.trim()} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Post Reflection
          </Button>
        </div>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id} className="p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{post.author}</span>
              <span>{post.timeAgo}</span>
            </div>
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {post.content}
            </p>
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{post.likes} hearts</span>
                <span>{post.replies} replies</span>
              </div>
              <button className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                <Flag className="h-3 w-3" /> Report
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
