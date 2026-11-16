import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/context/auth-context";
import { AuthModal } from "@/components/auth-modal";

export const metadata: Metadata = {
  title: "MindHaven – Mental Wellness Support",
  description:
    "Free, private and always-on AI mental wellness companion, peer connections, and verified consultations.",
  keywords: ["mental wellness", "AI support", "youth", "therapy", "peer support"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground selection:bg-accent/20 selection:text-foreground">
        <AuthProvider>
          <ThemeProvider>
            <div className="relative min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
            <AuthModal />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
