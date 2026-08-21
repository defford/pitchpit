import type { Tier } from "@/config/tiers";
import { TIERS } from "@/config/tiers";
import { cn } from "@/lib/utils";

const tierTone: Record<Tier, string> = {
  pit: "border-border text-muted-foreground",
  undercard: "border-silver/40 text-silver",
  main_event: "border-signal text-signal",
};

type TierMarkProps = {
  tier: Tier;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function TierMark({ tier, className, size = "sm" }: TierMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex border px-2 font-data uppercase",
        size === "sm" && "h-5 items-center text-[10px] tracking-[0.14em]",
        size === "md" && "h-6 items-center text-[11px] tracking-[0.16em]",
        size === "lg" && "h-8 items-center px-3 text-xs tracking-[0.18em]",
        tierTone[tier],
        className,
      )}
    >
      {TIERS[tier].label}
    </span>
  );
}
