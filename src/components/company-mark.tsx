"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { recordCompanyClick } from "@/lib/company-clicks";
import { initials } from "@/lib/format";
import { companyLogoCandidates } from "@/lib/logos";
import { cn } from "@/lib/utils";

const SIZE = {
  xs: "size-4",
  sm: "size-6 md:size-7",
  md: "size-8 sm:size-9",
  lg: "size-10 sm:size-11",
  xl: "size-12 md:size-16",
  "2xl": "size-16 md:size-24",
} as const;

type CompanyMarkSize = keyof typeof SIZE;

type CompanyMarkProps = {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  size?: CompanyMarkSize;
  className?: string;
};

function LogoImage({
  name,
  candidates,
  size,
  className,
}: {
  name: string;
  candidates: string[];
  size: CompanyMarkSize;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const src = candidates[index] ?? null;

  return (
    <Avatar
      className={cn(
        "rounded-sm after:rounded-sm after:mix-blend-normal dark:after:mix-blend-normal",
        SIZE[size],
        className,
      )}
    >
      {src ? (
        <AvatarImage
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="rounded-sm bg-white object-contain p-0.5"
          onError={() => setIndex((current) => current + 1)}
        />
      ) : null}
      <AvatarFallback className="rounded-sm bg-muted font-data text-[10px] text-silver">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function CompanyMark({
  name,
  logoUrl,
  websiteUrl,
  size = "md",
  className,
}: CompanyMarkProps) {
  const candidates = companyLogoCandidates({
    logoPath: logoUrl,
    websiteUrl,
  });

  return (
    <LogoImage
      key={candidates.join("|")}
      name={name}
      candidates={candidates}
      size={size}
      className={className}
    />
  );
}

function ClickCount({ count }: { count: number }) {
  return (
    <span
      className="pointer-events-none absolute right-1 bottom-0.5 font-data text-[9px] leading-none tabular-nums text-muted-foreground/40"
      aria-label={`${count} website clicks`}
    >
      {count}
    </span>
  );
}

type CompanyLinkProps = {
  name: string;
  companyId?: string | null;
  websiteUrl?: string | null;
  clickCount?: number;
  showCount?: boolean;
  className?: string;
  children: ReactNode;
};

export function CompanyLink({
  name,
  companyId,
  websiteUrl,
  clickCount = 0,
  showCount = true,
  className,
  children,
}: CompanyLinkProps) {
  const [count, setCount] = useState(clickCount);

  function track() {
    setCount((n) => n + 1);
    if (companyId) recordCompanyClick(companyId);
  }

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button === 0) track();
  }

  function onAuxClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button === 1) track();
  }

  if (!websiteUrl) {
    return (
      <span className={cn("relative inline-flex min-w-0", className)}>
        {children}
        {showCount ? <ClickCount count={count} /> : null}
      </span>
    );
  }

  return (
    <a
      href={websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${name}`}
      onClick={onClick}
      onAuxClick={onAuxClick}
      className={cn(
        "relative inline-flex min-w-0 rounded-sm no-underline outline-offset-2 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      {children}
      {showCount ? <ClickCount count={count} /> : null}
    </a>
  );
}

type CompanyIdentityProps = {
  name: string;
  logoUrl?: string | null;
  size?: CompanyMarkSize;
  align?: "left" | "right";
  className?: string;
  nameClassName?: string;
  websiteUrl?: string | null;
  companyId?: string | null;
  clickCount?: number;
};

export function CompanyIdentity({
  name,
  logoUrl,
  size = "md",
  align = "left",
  className,
  nameClassName,
  websiteUrl,
  companyId,
  clickCount,
}: CompanyIdentityProps) {
  return (
    <CompanyLink
      name={name}
      companyId={companyId}
      websiteUrl={websiteUrl}
      clickCount={clickCount}
      className={cn(
        "items-center gap-2 pb-2.5",
        align === "right" && "flex-row-reverse text-right",
        className,
      )}
    >
      <CompanyMark
        name={name}
        logoUrl={logoUrl}
        websiteUrl={websiteUrl}
        size={size}
      />
      <span className={cn("min-w-0 truncate", nameClassName)}>{name}</span>
    </CompanyLink>
  );
}
