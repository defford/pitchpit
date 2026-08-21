import { CompanyRow } from "@/components/leaderboard/company-row";
import { SectionRail } from "@/components/terminal/section-rail";
import type { LeaderboardCompany } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

type PitListProps = {
  companies: LeaderboardCompany[];
  className?: string;
};

export function PitList({ companies, className }: PitListProps) {
  return (
    <section className={cn("module", className)} aria-labelledby="pit-heading">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <SectionRail
          kicker="DEPTH / OPEN MARKET"
          title="THE PIT"
          titleId="pit-heading"
          aside={
            <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
              {companies.length} LISTED
            </span>
          }
        />
      </div>
      <ol className="flex flex-col">
        {companies.map((company) => (
          <CompanyRow key={company.id} company={company} intensity="plain" />
        ))}
      </ol>
    </section>
  );
}
