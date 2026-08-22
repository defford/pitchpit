import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live fights",
  description:
    "Preview the hourly card in The Pitch Pit, then vote one fight at a time. Six matchups, point splits, and rankings that move when the hour closes.",
};

export default function PitchPitLayout({
  children,
}: LayoutProps<"/the-pitch-pit">) {
  return children;
}
