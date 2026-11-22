"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  ShieldAlert,
  UserCheck,
  LogOut,
  Sparkles,
  Bell,
  Check,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { getPusherClient } from "@/lib/pusher-client";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "AI Chat" },
  { href: "/mood", label: "Mood Tracker" },
  { href: "/connect", label: "Connect" },
  { href: "/circle", label: "Circle" },
  { href: "/resources", label: "Resources" },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, loading, logout, openAuthModal } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    // Fetch async on mount or user change without direct synchronous setState in render
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && isMounted) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});

    const pusher = getPusherClient();
    if (pusher) {
      const channel = pusher.subscribe(`private-user-${user.id}`);
      channel.bind("new-message-notify", () => {
        fetchNotifications();
      });
      channel.bind("notification", () => {
        fetchNotifications();
      });

      return () => {
        isMounted = false;
        pusher.unsubscribe(`private-user-${user.id}`);
      };
    } else {
      // 15-second polling fallback for notifications
      const interval = setInterval(fetchNotifications, 15000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [user, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setNotificationsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Left */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-sm tracking-tight text-foreground"
        >
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-sm">
            <span className="text-xs font-bold font-mono">M</span>
          </div>
          <span>MindHaven</span>
        </Link>

        {/* Center Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notification Bell */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="View notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 z-50 w-80 max-h-[420px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-border bg-muted/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Bell className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-bold text-foreground">Notifications</span>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" /> Mark all read
                          </button>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            No notifications right now
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <Link
                              key={notif.id}
                              href={notif.link || "/circle?tab=CHATS"}
                              onClick={() => handleNotificationClick(notif)}
                              className={`block p-3 text-left transition-colors hover:bg-muted/50 ${
                                !notif.isRead ? "bg-primary/5" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-xs font-semibold ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                                  {notif.title}
                                </span>
                                {!notif.isRead && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-violet-600 flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                {notif.message}
                              </p>
                              <span className="text-[9px] text-muted-foreground/70 mt-1 block">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </Link>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2">
            {!loading && (
              <>
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent text-[10px] font-bold uppercase">
                        {user.name?.[0] || user.email[0]}
                      </div>
                      <span className="max-w-[120px] truncate">
                        {user.name || user.email.split("@")[0]}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>

                    <AnimatePresence>
                      {userDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setUserDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 mt-2 z-50 w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg"
                          >
                            <div className="px-2.5 py-1.5 border-b border-border/80">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {user.name || "Member"}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                            {user.role === "ADMIN" && (
                              <Link
                                href="/admin"
                                onClick={() => setUserDropdownOpen(false)}
                                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors mt-1"
                              >
                                <ShieldAlert className="h-3.5 w-3.5 text-accent" />
                                Admin Console
                              </Link>
                            )}
                            {(user.role === "PSYCHIATRIST" || user.role === "MEDICAL_STUDENT") && (
                              <Link
                                href="/expert/dashboard"
                                onClick={() => setUserDropdownOpen(false)}
                                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors mt-1"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-accent" />
                                Practitioner Console
                              </Link>
                            )}
                            <button
                              onClick={() => {
                                setUserDropdownOpen(false);
                                logout();
                              }}
                              className="w-full mt-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <LogOut className="h-3.5 w-3.5" />
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
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openAuthModal("register")}
                      className="text-xs"
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background px-4 py-4"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted font-medium"
                >
                  {link.label}
                </Link>
              ))}

              {!loading && (
                <div className="pt-3 border-t border-border mt-1">
                  {user ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground px-3">{user.email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                        }}
                        className="justify-start text-xs text-destructive hover:bg-destructive/10"
                      >
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMobileOpen(false);
                          openAuthModal("login");
                        }}
                      >
                        Sign In
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setMobileOpen(false);
                          openAuthModal("register");
                        }}
                      >
                        Get Started
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
