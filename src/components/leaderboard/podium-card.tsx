"use client";

import { useState } from "react";

import { CompanyLink, CompanyMark } from "@/components/company-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { LeaderboardCompany } from "@/lib/data/demo";
import { padRank } from "@/lib/format";
import { displayWebsiteHost, websiteScreenshotUrl } from "@/lib/logos";
import { cn } from "@/lib/utils";

type PodiumCardProps = {
  company: LeaderboardCompany;
};

function BrandedPreview({
  company,
  host,
}: {
  company: LeaderboardCompany;
  host: string | null;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-end gap-2 px-4 py-4",
        company.rank === 1 ? "bg-signal/10" : "bg-muted/25",
      )}
    >
      <CompanyMark
        name={company.name}
        logoUrl={company.logoUrl}
        websiteUrl={company.websiteUrl}
        size="lg"
      />
      <p className="font-display text-xl leading-none tracking-[0.04em] text-foreground">
        {company.name}
      </p>
      <p className="line-clamp-2 text-sm text-muted-foreground">
        {company.pitch}
      </p>
      {host ? <p className="text-sm text-signal">{host}</p> : null}
    </div>
  );
}

function WebsitePreview({
  company,
  host,
}: {
  company: LeaderboardCompany;
  host: string | null;
}) {
  const screenshot = websiteScreenshotUrl(company.websiteUrl);
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative size-full">
      <BrandedPreview company={company} host={host} />
      {screenshot && !failed ? (
        // Fallible third-party capture; branded preview stays underneath.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshot}
          alt=""
          className="absolute inset-0 size-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

export function PodiumCard({ company }: PodiumCardProps) {
  const champion = company.rank === 1;
  const host = displayWebsiteHost(company.websiteUrl);
  const subtitle = host ?? company.pitch;

  return (
    <li value={company.rank} className="min-w-0">
      <CompanyLink
        name={company.name}
        companyId={company.id}
        websiteUrl={company.websiteUrl}
        clickCount={company.clickCount}
        showCount={false}
        className="h-full w-full flex-col"
      >
        <Card className="h-full gap-3 rounded-[1.25rem] py-4 shadow-none">
          <CardContent>
            <div className="aspect-[16/10] overflow-hidden rounded-[0.9rem] border border-border bg-background">
              <WebsitePreview company={company} host={host} />
            </div>
          </CardContent>
          <CardFooter className="gap-3 border-0 bg-transparent">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <CompanyMark
                name={company.name}
                logoUrl={company.logoUrl}
                websiteUrl={company.websiteUrl}
                size="md"
                className="rounded-md after:rounded-md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                  {company.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            </div>
            {champion ? (
              <Badge className="rounded-full border-0 bg-foreground px-2.5 text-background normal-case tracking-normal">
                Champion
              </Badge>
            ) : (
              <span
                className="shrink-0 font-data text-xs text-muted-foreground"
                aria-label={`Rank ${company.rank}`}
              >
                {padRank(company.rank)}
              </span>
            )}
          </CardFooter>
        </Card>
      </CompanyLink>
    </li>
  );
}
