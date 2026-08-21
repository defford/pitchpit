import { test, expect } from "@playwright/test";

test.describe("THE DECAGON public experience", () => {
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

    const undercard = page.getByRole("button", { name: /UNDERCARD/i });
    await expect(undercard).toBeVisible();
    await undercard.click();
    await expect(
      page.getByRole("heading", { name: /THE UNDERCARD/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("decagon loads a battle and accepts a vote", async ({ page }) => {
    await page.goto("/decagon");
    await expect(page.getByText(/DECAGON/i).first()).toBeVisible();

    const enter = page.getByRole("button", { name: /ENTER THE DECAGON/i });
    const vote = page.getByRole("button", { name: /CAST VOTE/i });

    if (await enter.isVisible().catch(() => false)) {
      await enter.click();
    }

    await expect(vote.first()).toBeVisible({ timeout: 20000 });
    await vote.first().click();
    const next = page.getByRole("button", { name: /NEXT FIGHT/i });
    await expect(next).toBeVisible({ timeout: 20000 });
    await next.click();
    await expect(
      page.getByRole("button", { name: /CAST VOTE/i }).first(),
    ).toBeVisible({
      timeout: 20000,
    });
  });

  test("login page renders magic link form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send|magic|sign/i }),
    ).toBeVisible();
  });
});
