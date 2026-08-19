import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/context/auth-context";
import { AuthModal } from "@/components/auth-modal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MINDHAVEN – AI Mental Wellness for Youth",
  description:
    "Your safe space for mental wellness. AI-powered, confidential, empathetic support for youth seeking emotional guidance.",
  keywords: ["mental health", "AI wellness", "youth", "India", "therapy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
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
