import { describe, expect, it } from "vitest";

import { incrementCompanyClick } from "@/lib/data/companies";
import { getDemoStore } from "@/lib/data/demo-store";

describe("company outbound clicks", () => {
  it("increments a seeded demo company", async () => {
    const company = [...getDemoStore().companies.values()][0]!;
    const start = company.click_count ?? 0;
    const first = await incrementCompanyClick(company.id);
    const second = await incrementCompanyClick(company.id);
    expect(first).toBe(start + 1);
    expect(second).toBe(start + 2);
  });

  it("tracks synthetic demo leaderboard ids", async () => {
    const id = "demo-pit-99";
    const first = await incrementCompanyClick(id);
    const second = await incrementCompanyClick(id);
    expect(first).toBeGreaterThanOrEqual(1);
    expect(second).toBe(first! + 1);
  });
});
