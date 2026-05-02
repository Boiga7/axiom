import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/github-dark-dimmed.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://elliot-digital.co.uk"),
  title: {
    default: "The Axiom",
    template: "%s · The Axiom",
  },
  description:
    "An AI engineering knowledge base — LLMs, agents, RAG, evals, safety, infrastructure, and the full stack behind frontier AI systems.",
  openGraph: {
    title: "The Axiom",
    description: "AI engineering knowledge base",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable} ${mono.variable}`}>
      <body className="antialiased bg-base text-primary">
        {children}
      </body>
    </html>
  );
}
