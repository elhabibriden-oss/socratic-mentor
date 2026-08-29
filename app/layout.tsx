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
  title: "Socratic Core AI | First Principles Dialectic Engine",
  description: "Deconstruct reality, examine concepts, and engage in unyielding philosophical inquiry powered by rigorous first-principles reasoning.",
  keywords: ["Socratic AI", "first principles", "philosophy AI chatbot", "dialectic engine", "critical thinking"],
  openGraph: {
    title: "Socratic Core AI",
    description: "Deconstruct reality from absolute foundational premises.",
    siteName: "Socratic Core AI",
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