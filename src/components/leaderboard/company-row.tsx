import { CompanyLink, CompanyMark } from "@/components/company-mark";
import { DataLabel, DataStat } from "@/components/terminal/data-label";
import { RankMovement } from "@/components/terminal/rank-movement";
import { formatRating, formatRecord, padRank } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Intensity, LeaderboardCompany } from "@/lib/data/demo";

type CompanyRowProps = {
  company: LeaderboardCompany;
  intensity?: Intensity;
  className?: string;
};

function railClass(rank: number, intensity: Intensity): string {
  if (intensity === "loud" && rank === 1) return "rank-rail-1";
  if (intensity === "loud" && rank <= 3) return "rank-rail-top3";
  if (rank <= 10) return "rank-rail-top10";
  return "";
}

export function CompanyRow({
  company,
  intensity = company.intensity,
  className,
}: CompanyRowProps) {
  const isChampion = intensity === "loud" && company.rank === 1;
  const isPodium = intensity === "loud" && company.rank <= 3;
  const record = formatRecord(company.wins, company.losses);

  return (
    <li
      value={company.rank}
      className={cn(railClass(company.rank, intensity), className)}
    >
      <CompanyLink
        name={company.name}
        companyId={company.id}
        websiteUrl={company.websiteUrl}
        clickCount={company.clickCount}
        className={cn(
          "grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2 pb-4 sm:gap-x-4 sm:px-4",
          "border-b border-border",
          isChampion && "rank-pop rank-pop-1 bg-signal/5 pt-3 pb-5 sm:pt-3.5",
          isPodium &&
            !isChampion &&
            "rank-pop bg-foreground/[0.03] py-2.5 pb-4",
        )}
      >
        <span
          className={cn(
            "font-display w-10 shrink-0 text-right leading-none tabular-nums sm:w-12",
            isChampion && "text-3xl text-signal sm:text-4xl",
            isPodium && !isChampion && "text-2xl text-foreground sm:text-3xl",
            !isPodium && intensity === "loud" && "text-xl text-silver",
            intensity === "bold" && "text-lg text-silver",
            intensity === "plain" && "font-data text-xs text-muted-foreground",
          )}
          aria-label={`Rank ${company.rank}`}
        >
          {padRank(company.rank)}
        </span>
        <CompanyMark
          name={company.name}
          logoUrl={company.logoUrl}
          websiteUrl={company.websiteUrl}
          size={isChampion ? "lg" : "md"}
        />
        <div className="min-w-0">
          {isChampion ? (
            <p className="font-data mb-0.5 text-[10px] tracking-[0.18em] text-signal">
              CHAMPION
            </p>
          ) : null}
          <p
            className={cn(
              "truncate font-display leading-none tracking-[0.04em]",
              isChampion && "text-2xl text-foreground sm:text-3xl",
              isPodium && !isChampion && "text-xl text-foreground sm:text-2xl",
              !isPodium && intensity !== "plain" && "text-lg text-foreground",
              intensity === "plain" &&
                "font-sans text-sm font-medium tracking-normal text-foreground",
            )}
          >
            {company.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground italic">
            “{company.pitch}”
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
          <DataLabel label="RATING" value={formatRating(company.elo)} />
          <RankMovement delta={company.rankDelta} />
          {record ? <DataStat>{record}</DataStat> : null}
        </div>
      </CompanyLink>
    </li>
  );
}
