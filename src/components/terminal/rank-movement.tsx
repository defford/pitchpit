import { cn } from "@/lib/utils";

type RankMovementProps = {
  delta?: number;
  className?: string;
};

export function RankMovement({ delta, className }: RankMovementProps) {
  if (delta == null || delta === 0) {
    return (
      <span
        className={cn(
          "font-data text-[10px] text-muted-foreground sm:text-xs",
          className,
        )}
        aria-label="No rank movement"
      >
        —
      </span>
    );
  }

  if (delta > 0) {
    return (
      <span
        className={cn("font-data text-[10px] text-up sm:text-xs", className)}
        aria-label={`Up ${delta}`}
      >
        ▲ {delta}
      </span>
    );
  }

  return (
    <span
      className={cn("font-data text-[10px] text-down sm:text-xs", className)}
      aria-label={`Down ${Math.abs(delta)}`}
    >
      ▼ {Math.abs(delta)}
    </span>
  );
}

type RatingDeltaProps = {
  delta: number;
  className?: string;
};

export function RatingDelta({ delta, className }: RatingDeltaProps) {
  const rounded = Math.round(delta);
  if (rounded === 0) {
    return (
      <span
        className={cn("font-data text-xs text-muted-foreground", className)}
      >
        —
      </span>
    );
  }
  if (rounded > 0) {
    return (
      <span className={cn("font-data text-xs text-up", className)}>
        ▲ +{rounded}
      </span>
    );
  }
  return (
    <span className={cn("font-data text-xs text-down", className)}>
      ▼ {rounded}
    </span>
  );
}
