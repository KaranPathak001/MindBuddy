"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Moon,
  Sun,
  MessageCircle,
  Heart,
  Wind,
  BookOpen,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const navLinks: { href: string; label: string; icon?: LucideIcon }[] = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "AI Chat", icon: MessageCircle },
  { href: "/mood", label: "Mood Tracker", icon: Heart },
  { href: "/wellness", label: "Wellness Tools", icon: Wind },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/community", label: "Community", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
        >
          <span className="bg-gradient-to-r from-violet-500 to-teal-500 bg-clip-text text-transparent">
            MINDHAVEN
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.slice(1).map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait">
              {theme === "dark" ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">Log in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="default" size="sm">Sign up</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl"
          >
            <div className="flex flex-col p-4 gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2",
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="default" className="w-full" onClick={() => setMobileOpen(false)}>
                    Sign up
                  </Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <div className="p-2 border-t mt-2">
                  <UserButton />
                </div>
              </Show>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
