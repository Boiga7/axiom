import { test, expect } from "@playwright/test";

test.describe("Category page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");
  });

  test("renders category heading", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Agents");
  });

  test("shows page count", async ({ page }) => {
    await expect(page.locator("text=/\\d+ pages?/")).toBeVisible();
  });

  test("back link navigates to homepage", async ({ page }) => {
    // Scope to main to avoid matching the nav logo which also reads "The Axiom"
    const backLink = page.locator("main").getByRole("link", { name: /The Axiom/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL("/");
    expect(page.url()).toMatch(/\/$/);
  });

  test("page list shows entry cards", async ({ page }) => {
    const links = page.locator("main .grid a, main .gap-2 a");
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking an entry card navigates to the wiki page", async ({ page }) => {
    // Find first non-hub page link in the list
    const firstEntry = page.locator("main a[href^='/agents/']").first();
    await expect(firstEntry).toBeVisible();
    const href = await firstEntry.getAttribute("href");
    await firstEntry.click();
    await page.waitForURL(`**${href}`);
    expect(page.url()).toContain("/agents/");
  });

  test("nav Lab link is visible on category page", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Practice Lab" })).toBeVisible();
  });
});

test.describe("Wiki page — syntax highlighting", () => {
  test("code block background is dark (not white)", async ({ page }) => {
    // Navigate to a page known to have code blocks
    await page.goto("/apis/anthropic-api");
    await page.waitForLoadState("networkidle");

    const codeBlock = page.locator("pre code, .hljs").first();
    const count = await codeBlock.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await expect(codeBlock).toBeVisible();

    const bgColor = await codeBlock.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should NOT be white (rgb(255, 255, 255)) or near-white
    expect(bgColor).not.toBe("rgb(255, 255, 255)");
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
  });
});
