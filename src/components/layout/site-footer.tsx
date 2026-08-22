import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("mt-auto border-t border-border bg-card", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="w-fit transition hover:opacity-90">
          <BrandLogo size="footer" />
        </Link>
        <p className="max-w-md text-silver">
          A live ranking exchange. Vote. Climb. Reset at session close.
        </p>
        <div className="flex flex-wrap gap-4 font-data text-[10px] tracking-[0.14em] uppercase">
          <Link href="/how-it-works" className="hover:text-signal">
            How it works
          </Link>
          <Link href="/how-it-works#faq" className="hover:text-signal">
            FAQ
          </Link>
          <Link href="/the-pitch-pit" className="hover:text-signal">
            Enter The Pitch Pit
          </Link>
          <Link href="/" className="hover:text-signal">
            View the Rankings
          </Link>
        </div>
      </div>
    </footer>
  );
}
