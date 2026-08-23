import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Oswald({
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pitchpit.lol";
const appDescription =
  "Bring your pitch. Fight for first. Companies compete on a live ranking card. Drop your link, pick a pool, and fight.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "The Pitch Pit",
    template: "%s · The Pitch Pit",
  },
  description: appDescription,
  applicationName: "The Pitch Pit",
  openGraph: {
    title: "The Pitch Pit",
    description: appDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Pitch Pit",
    description: appDescription,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        {children}
        <ConditionalFooter />
        <Analytics />
      </body>
    </html>
  );
}
