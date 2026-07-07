import type { Metadata } from "next";
import { JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const jbm = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jbm",
  display: "swap",
});

const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MCSR Stats — Speedrun Performance Lookup",
  description:
    "Look up any Minecraft speedrunner's Any% Random Seed stats: splits, checkpoints, seed performance, and consistency.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jbm.variable} ${pixel.variable}`}>
      <body className="font-mono min-h-screen antialiased">{children}</body>
    </html>
  );
}
