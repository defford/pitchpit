"use client";

import { useId, useState } from "react";

import { CompanyRow } from "@/components/leaderboard/company-row";
import { SectionRail } from "@/components/terminal/section-rail";
import { Button } from "@/components/ui/button";
import type { LeaderboardCompany } from "@/lib/data/demo";
import { padRank } from "@/lib/format";
import { cn } from "@/lib/utils";

const PIT_PAGE_SIZE = 10;

type PitListProps = {
  companies: LeaderboardCompany[];
  className?: string;
};

export function PitList({ companies, className }: PitListProps) {
  const statusId = useId();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(companies.length / PIT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PIT_PAGE_SIZE;
  const pageCompanies = companies.slice(start, start + PIT_PAGE_SIZE);
  const startRank = start + 1;
  const endRank = start + pageCompanies.length;
  const showPager = companies.length > PIT_PAGE_SIZE;

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
      <p id={statusId} className="sr-only" aria-live="polite">
        {companies.length === 0
          ? "No companies listed"
          : `Showing ranks ${startRank} to ${endRank} of ${companies.length}`}
      </p>
      <ol className="flex flex-col">
        {pageCompanies.map((company) => (
          <CompanyRow key={company.id} company={company} intensity="plain" />
        ))}
      </ol>
      {showPager ? (
        <nav
          className="flex items-center justify-between gap-3 border-t border-border px-3 py-3 sm:px-4"
          aria-label="Pit pages"
          aria-describedby={statusId}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-none"
            disabled={currentPage <= 1}
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
            PAGE {padRank(currentPage)} / {padRank(totalPages)}
            <span className="hidden sm:inline">
              {` · ${padRank(startRank)}–${padRank(endRank)}`}
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-none"
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
