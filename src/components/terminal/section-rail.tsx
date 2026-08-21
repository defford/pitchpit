import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionRailProps = {
  kicker?: string;
  title: string;
  titleId?: string;
  aside?: ReactNode;
  className?: string;
};

export function SectionRail({
  kicker,
  title,
  titleId,
  aside,
  className,
}: SectionRailProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {kicker ? (
          <p className="font-data text-[10px] tracking-[0.18em] text-muted-foreground">
            {kicker}
          </p>
        ) : null}
        <h2
          id={titleId}
          className="font-display text-3xl leading-none tracking-[0.06em] text-foreground sm:text-4xl"
        >
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}
