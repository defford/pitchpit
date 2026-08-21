import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataLabelProps = {
  label: string;
  value: string | number;
  className?: string;
};

export function DataLabel({ label, value, className }: DataLabelProps) {
  return (
    <span
      className={cn("font-data text-[10px] text-silver sm:text-xs", className)}
    >
      <span className="text-muted-foreground">{label}</span> {value}
    </span>
  );
}

type DataStatProps = {
  children: ReactNode;
  className?: string;
};

export function DataStat({ children, className }: DataStatProps) {
  return (
    <span
      className={cn(
        "font-data text-[10px] tracking-[0.08em] text-silver sm:text-xs",
        className,
      )}
    >
      {children}
    </span>
  );
}
