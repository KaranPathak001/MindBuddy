"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Send, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MOCK_POSTS = [
  {
    id: "1",
    content: "Had a rough week with assignments. Taking it one day at a time. Anyone else feel this way?",
    date: "2 hours ago",
    isAnonymous: true,
  },
  {
    id: "2",
    content: "Just completed my first breathing exercise in weeks. Feels good to take a moment for myself.",
    date: "5 hours ago",
    isAnonymous: true,
  },
];

export default function CommunityPage() {
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState(MOCK_POSTS);

  const submitPost = () => {
    if (!newPost.trim()) return;
    setPosts((prev) => [
      {
        id: crypto.randomUUID(),
        content: newPost.trim(),
        date: "Just now",
        isAnonymous: true,
      },
      ...prev,
    ]);
    setNewPost("");
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Anonymous Community</h1>
          <p className="text-muted-foreground">
            Share and support in a safe, moderated space. AI filters toxic content.
          </p>
        </div>

        <Card className="glass border-primary/20">
          <CardContent className="p-6">
            <div className="flex gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Share anonymously</p>
                <p className="text-xs text-muted-foreground">
                  Your identity stays private
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="flex-1"
              />
              <Button onClick={submitPost}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          All posts are moderated. Be kind and supportive.
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass">
                <CardContent className="p-6">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        Anonymous • {post.date}
                      </p>
                      <p className="whitespace-pre-wrap">{post.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
