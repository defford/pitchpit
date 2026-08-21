import { cn } from "@/lib/utils";

export type TickerItem = {
  id: string;
  text: string;
};

type MarketTickerProps = {
  items: TickerItem[];
  className?: string;
};

export function MarketTicker({ items, className }: MarketTickerProps) {
  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div
      className={cn(
        "overflow-hidden border-y border-border bg-card",
        className,
      )}
      aria-label="Live market feed"
    >
      <div className="flex whitespace-nowrap">
        <div className="animate-ticker flex min-w-full shrink-0 items-center">
          {loop.map((item, index) => (
            <span
              key={`${item.id}-${index}`}
              className="font-data inline-flex items-center px-4 py-1.5 text-[10px] tracking-[0.12em] text-silver sm:text-[11px]"
            >
              <span className="mr-4 text-signal">/</span>
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
