import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Socratic Mentor | First Principles Dialectic AI",
  description: "Socratic Mentor is an unyielding dialectic engine designed to deconstruct concepts and examine reality from absolute foundational first principles.",
  keywords: ["Socratic Mentor", "Socratic AI", "first principles", "philosophy chatbot", "dialectic engine"],
  verification: {
    google: "IvXP6SmcK0bf6TSNaCWgXY6tVbEyZteBMf4ZC29QgGs",
  },
  openGraph: {
    title: "Socratic Mentor",
    description: "Deconstruct reality from absolute foundational premises.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}