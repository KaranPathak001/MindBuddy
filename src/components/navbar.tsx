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
  User as UserIcon,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

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
  const { user, loading, logout, openAuthModal } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
        >
          <span className="bg-gradient-to-r from-violet-500 to-teal-500 bg-clip-text text-transparent">
            HEALTECH
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
            {!loading && (
              <>
                {user ? (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="gap-2"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-xs uppercase">
                        {user.name?.[0] || user.email[0]}
                      </div>
                      <span className="max-w-[120px] truncate text-sm font-medium">
                        {user.name || user.email.split("@")[0]}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>

                    <AnimatePresence>
                      {userDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setUserDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 z-50 w-56 rounded-xl border border-border bg-card p-2 shadow-xl"
                          >
                            <div className="px-3 py-2 border-b border-border/50">
                              <p className="text-sm font-semibold truncate">{user.name || "User"}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            <button
                              onClick={() => {
                                setUserDropdownOpen(false);
                                logout();
                              }}
                              className="w-full mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <LogOut className="h-4 w-4" />
                              Log out
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAuthModal("login")}
                    >
                      Log in
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openAuthModal("register")}
                    >
                      Sign up
                    </Button>
                  </>
                )}
              </>
            )}
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

              {!loading && (
                <div className="pt-2 border-t border-border/40">
                  {user ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        <UserIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium truncate">{user.email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setMobileOpen(false);
                          openAuthModal("login");
                        }}
                      >
                        Log in
                      </Button>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          setMobileOpen(false);
                          openAuthModal("register");
                        }}
                      >
                        Sign up
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
