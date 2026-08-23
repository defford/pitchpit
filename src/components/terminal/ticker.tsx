import { CompanyLink, CompanyMark } from "@/components/company-mark";
import { cn } from "@/lib/utils";

export type TickerItem = {
  id: string;
  text: string;
  logoUrl?: string | null;
  companyId?: string;
  websiteUrl?: string | null;
  clickCount?: number;
  companyName?: string;
};

type MarketTickerProps = {
  items: TickerItem[];
  className?: string;
};

function TickerCopy({ item }: { item: TickerItem }) {
  const inner = (
    <>
      <span className="mr-4 text-signal">/</span>
      {item.logoUrl || item.websiteUrl ? (
        <CompanyMark
          name={item.companyName ?? item.text}
          logoUrl={item.logoUrl}
          websiteUrl={item.websiteUrl}
          size="xs"
          className="mr-1.5"
        />
      ) : null}
      {item.text}
    </>
  );

  if (!item.websiteUrl) {
    return (
      <span className="font-data inline-flex items-center px-4 py-1.5 text-[10px] tracking-[0.12em] text-silver sm:text-[11px]">
        {inner}
      </span>
    );
  }

  return (
    <CompanyLink
      name={item.companyName ?? item.text}
      companyId={item.companyId}
      websiteUrl={item.websiteUrl}
      clickCount={item.clickCount}
      showCount={false}
      className="font-data items-center px-4 py-1.5 text-[10px] tracking-[0.12em] text-silver hover:text-signal sm:text-[11px]"
    >
      {inner}
    </CompanyLink>
  );
}

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
            <TickerCopy key={`${item.id}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
