"use client";

import { motion } from "framer-motion";
import { BookOpen, Phone, GraduationCap, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const RESOURCES = [
  {
    category: "Articles",
    icon: FileText,
    items: [
      { title: "Understanding Anxiety", desc: "Learn about anxiety and coping strategies" },
      { title: "Healthy Sleep Habits", desc: "Tips for better rest" },
      { title: "Social Media & Mental Health", desc: "Balancing screen time" },
    ],
  },
  {
    category: "Student Support",
    icon: GraduationCap,
    items: [
      { title: "Exam Stress Management", desc: "Techniques for students" },
      { title: "Career Anxiety Guide", desc: "Navigating uncertainty" },
    ],
  },
];

const HELPLINES = [
  { name: "Vandrevala Foundation", number: "1860-2662-345", type: "24/7" },
  { name: "iCall", number: "022-2552-1111", type: "Mon-Sat" },
  { name: "Kiran", number: "1800-599-0019", type: "24/7" },
  { name: "National Helpline", number: "080-4611-0007", type: "24/7" },
];

export default function ResourcesPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Resources</h1>
          <p className="text-muted-foreground">
            Articles, guides, and crisis helplines for your mental wellness
          </p>
        </div>

        {/* Crisis Helplines - Prominent */}
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Phone className="h-5 w-5 text-red-500" />
              Crisis Helplines (India)
            </h2>
            <p className="text-sm text-muted-foreground">
              If you&apos;re in crisis, please reach out. These helplines are available.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {HELPLINES.map((h) => (
                <div
                  key={h.name}
                  className="p-4 rounded-xl bg-background/50 border"
                >
                  <p className="font-semibold">{h.name}</p>
                  <a
                    href={`tel:${h.number.replace(/-/g, "")}`}
                    className="text-primary hover:underline"
                  >
                    {h.number}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">{h.type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Articles & Guides */}
        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Articles & Guides
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {RESOURCES.map((group) => {
              const Icon = group.icon;
              return (
                <Card key={group.category} className="glass">
                  <CardHeader>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      {group.category}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {group.items.map((item) => (
                        <li
                          key={item.title}
                          className="p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.desc}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
