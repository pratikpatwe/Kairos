import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Kairos - Act at the Right Moment",
  description: "Kairos is an AI-powered life management platform that brings your finances, habits, and mental well-being into one intelligent system. Track what matters, understand your patterns, and make better daily decisions.",
  keywords: ["AI", "life management", "finance tracking", "habit tracker", "mental well-being", "productivity", "personal growth"],
  authors: [{ name: "Kairos Team" }],
  openGraph: {
    title: "Kairos - Act at the Right Moment",
    description: "AI-powered life management for finances, habits, and well-being.",
    type: "website",
    images: [
      {
        url: "https://kairos-buildshot.vercel.app/kairos-OGI.png",
        width: 1200,
        height: 630,
        alt: "Kairos - AI-powered life management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kairos - Act at the Right Moment",
    description: "AI-powered life management for finances, habits, and well-being.",
    images: ["https://kairos-buildshot.vercel.app/kairos-X.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kairos",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "viewport-fit": "cover",
  },
  icons: {
    apple: "/kairos-logo.svg",
  }
};

export const viewport = {
  themeColor: "#0B0B0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0B0B] text-white`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
