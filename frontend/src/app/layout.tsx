import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Providers from "@/app/providers";
import AuthGuard from "@/app/guards/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ForceCodeX — Nền tảng học lập trình",
  description:
    "Học tập, bài tập code và chấm tự động cho sinh viên, giảng viên và quản trị.",
};

import { Suspense } from "react";

// ... existing imports ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <Suspense fallback={<div>Loading...</div>}>
            <AuthGuard>
              {children}
            </AuthGuard>
          </Suspense>
        </Providers>
      </body>
    </html >
  );
}
