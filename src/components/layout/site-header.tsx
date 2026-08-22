import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Rankings" },
  { href: "/the-pitch-pit", label: "The Pitch Pit" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/login", label: "Join" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

type SiteHeaderProps = {
  showAdmin?: boolean;
  className?: string;
};

export function SiteHeader({ showAdmin = false, className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background",
        className,
      )}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center transition hover:opacity-90"
        >
          <BrandLogo size="header" />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-0 sm:gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-silver uppercase transition hover:text-foreground sm:px-3 sm:text-xs"
            >
              {link.label}
            </Link>
          ))}
          {showAdmin ? (
            <Link
              href="/admin"
              className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-signal uppercase transition hover:text-foreground sm:px-3 sm:text-xs"
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
