import { test, expect } from "@playwright/test";

test.describe("THE PITCH PIT public experience", () => {
  test("homepage shows three leaderboard sections and undercard toggle works", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("img", { name: /the pitch pit/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /TODAY'S RANKINGS/i }),
    ).toBeVisible();
    await expect(page.getByText(/THE MAIN EVENT/i).first()).toBeVisible();
    await expect(page.getByText(/THE PIT/i).first()).toBeVisible();
    await expect(page.getByText("Tiny Ticket", { exact: true })).toBeVisible();
    await expect(page.getByText("Brick Batch", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText("Brick Batch", { exact: true })).toBeVisible();

    const undercard = page.getByRole("button", { name: /UNDERCARD/i });
    await expect(undercard).toBeVisible();
    await undercard.click();
    await expect(
      page.getByRole("heading", { name: /THE UNDERCARD/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("the pitch pit shows the full hourly card and accepts a pit vote", async ({
    page,
  }) => {
    await page.goto("/the-pitch-pit");
    await expect(page.getByText(/THE PITCH PIT/i).first()).toBeVisible();
    await expect(page.getByTestId("card-fight")).toHaveCount(6, {
      timeout: 20000,
    });
    await expect(
      page.getByRole("heading", { name: "THE PIT", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /THE UNDERCARD/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /THE MAIN EVENT/i }),
    ).toBeVisible();
    await expect(page.getByText(/NEXT CARD/i).first()).toBeVisible();

    const vote = page.getByRole("button", { name: /cast vote for/i });
    await expect(vote).toHaveCount(6);
    await vote.first().click();
    await expect(page.getByText(/YOUR PICK/i).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId("card-fight")).toHaveCount(6);
  });

  test("mobile matchup keeps both companies on screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/the-pitch-pit");

    const firstFight = page.getByTestId("card-fight").first();
    await expect(firstFight).toBeVisible({ timeout: 20000 });
    const votes = firstFight.getByRole("button", { name: /cast vote for/i });
    await expect(votes).toHaveCount(2);

    const first = votes.nth(0);
    const second = votes.nth(1);
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();

    const a = await first.boundingBox();
    const b = await second.boundingBox();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a!.x).toBeLessThan(b!.x);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(24);
    expect(a!.y + a!.height).toBeLessThanOrEqual(844);
    expect(b!.y + b!.height).toBeLessThanOrEqual(844);
  });

  test("card history expands a prior hour", async ({ page }) => {
    await page.goto("/the-pitch-pit/history");
    await expect(
      page.getByRole("heading", { name: /CARD HISTORY/i }),
    ).toBeVisible();
    const trigger = page.getByRole("button").filter({
      hasText: /FIGHTS/,
    });
    await expect(trigger.first()).toBeVisible();
    await trigger.first().click();
    await expect(page.getByText(/–/).first()).toBeVisible();
  });

  test("how-it-works explains listing and expands FAQ", async ({ page }) => {
    await page.goto("/how-it-works");
    await expect(
      page.getByRole("heading", { name: /HOW THE PIT WORKS/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /GET ON THE CARD/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /^FAQ$/i })).toBeVisible();

    const question = page.getByRole("button", {
      name: /What is The Pitch Pit/i,
    });
    const answer = page.getByText(/A live ranking exchange for companies/i);
    await expect(question).toBeVisible();
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
  });

  test("login page renders magic link form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send|magic|sign/i }),
    ).toBeVisible();
  });

  test("admin login uses password instead of a magic link", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await expect(
      page.getByRole("heading", { name: /admin login/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
