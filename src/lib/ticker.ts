import type { LeaderboardsPayload } from "@/lib/data/demo";
import { padRank } from "@/lib/format";
import type { TickerItem } from "@/components/terminal/ticker";

export function buildTickerItems(boards: LeaderboardsPayload): TickerItem[] {
  const items: TickerItem[] = [];
  const champion = boards.mainEvent[0];
  if (champion) {
    items.push({
      id: "champ",
      text: `NEW #1 · ${champion.name.toUpperCase()}`,
    });
    items.push({
      id: "lead",
      text: `MAIN EVENT · ${champion.name.toUpperCase()} HOLDS #${padRank(champion.rank)}`,
    });
  }

  const pitLead = boards.pit[0];
  if (pitLead) {
    items.push({
      id: "pit",
      text: `${pitLead.name.toUpperCase()} LEADS THE PIT`,
    });
  }

  const under = boards.undercard[0];
  if (under) {
    items.push({
      id: "under",
      text: `UNDERCARD · ${under.name.toUpperCase()} AT #${padRank(under.rank)}`,
    });
  }

  const mover = boards.mainEvent.find((c) => (c.rankDelta ?? 0) > 0);
  if (mover) {
    items.push({
      id: "mover",
      text: `${mover.name.toUpperCase()} ▲ ${mover.rankDelta}`,
    });
  }

  const faller = [...boards.mainEvent, ...boards.undercard, ...boards.pit].find(
    (c) => (c.rankDelta ?? 0) < 0,
  );
  if (faller) {
    items.push({
      id: "fall",
      text: `${faller.name.toUpperCase()} FALLS TO #${padRank(faller.rank)}`,
    });
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
