import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live fights",
  description:
    "Vote in The Pitch Pit. Shared fights, live tallies, and rankings that move when a series is decided.",
};

export default function PitchPitLayout({
  children,
}: LayoutProps<"/the-pitch-pit">) {
  return children;
}
