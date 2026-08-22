"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/the-pitch-pit") return null;
  return <SiteFooter />;
}
