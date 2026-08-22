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

  test("the pitch pit loads a battle and accepts a vote", async ({ page }) => {
    await page.goto("/the-pitch-pit");
    await expect(page.getByText(/THE PITCH PIT/i).first()).toBeVisible();

    const enter = page.getByRole("button", { name: /ENTER THE PITCH PIT/i });
    const vote = page.getByRole("button", { name: /cast vote for/i });

    if (await enter.isVisible().catch(() => false)) {
      await enter.click();
    }

    await expect(vote.first()).toBeVisible({ timeout: 20000 });
    await vote.first().click();
    const next = page.getByRole("button", { name: /NEXT FIGHT/i });
    await expect(next).toBeVisible({ timeout: 20000 });
    await next.click();
    await expect(
      page.getByRole("button", { name: /cast vote for/i }).first(),
    ).toBeVisible({
      timeout: 20000,
    });
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
