import type { LeaderboardsPayload } from "@/lib/data/demo";
import { padRank } from "@/lib/format";
import type { TickerItem } from "@/components/terminal/ticker";

function companyTicker(
  prefix: string,
  company: LeaderboardsPayload["mainEvent"][number],
  text: string,
): TickerItem {
  return {
    id: prefix,
    text,
    logoUrl: company.logoUrl,
    companyId: company.id,
    websiteUrl: company.websiteUrl,
    clickCount: company.clickCount,
    companyName: company.name,
  };
}

export function buildTickerItems(boards: LeaderboardsPayload): TickerItem[] {
  const items: TickerItem[] = [];
  const champion = boards.mainEvent[0];
  if (champion) {
    items.push(
      companyTicker(
        "champ",
        champion,
        `NEW #1 · ${champion.name.toUpperCase()}`,
      ),
    );
    items.push(
      companyTicker(
        "lead",
        champion,
        `HEAVYWEIGHTS · ${champion.name.toUpperCase()} HOLDS #${padRank(champion.rank)}`,
      ),
    );
  }

  const pitLead = boards.pit[0];
  if (pitLead) {
    items.push(
      companyTicker(
        "pit",
        pitLead,
        `${pitLead.name.toUpperCase()} LEADS THE LIGHTWEIGHTS`,
      ),
    );
  }

  const under = boards.undercard[0];
  if (under) {
    items.push(
      companyTicker(
        "under",
        under,
        `MIDDLEWEIGHTS · ${under.name.toUpperCase()} AT #${padRank(under.rank)}`,
      ),
    );
  }

  const mover = boards.mainEvent.find((c) => (c.rankDelta ?? 0) > 0);
  if (mover) {
    items.push(
      companyTicker(
        "mover",
        mover,
        `${mover.name.toUpperCase()} ▲ ${mover.rankDelta}`,
      ),
    );
  }

  const faller = [...boards.mainEvent, ...boards.undercard, ...boards.pit].find(
    (c) => (c.rankDelta ?? 0) < 0,
  );
  if (faller) {
    items.push(
      companyTicker(
        "fall",
        faller,
        `${faller.name.toUpperCase()} FALLS TO #${padRank(faller.rank)}`,
      ),
    );
  }

  items.push({
    id: "cta",
    text: "ENTER THE PITCH PIT",
  });

  items.push({
    id: "session",
    text: `SESSION CLOSES ${new Date(boards.seasonEndsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
  });

  return items;
}
