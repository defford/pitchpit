import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live fights",
  description:
    "Vote the full hourly card in The Pitch Pit. Six fights, point splits, and rankings that move when the hour closes.",
};

export default function PitchPitLayout({
  children,
}: LayoutProps<"/the-pitch-pit">) {
  return children;
}
