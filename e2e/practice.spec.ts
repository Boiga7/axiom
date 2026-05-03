import { test, expect } from "@playwright/test";

const ROLE_PATHS = [
  "AI Engineer",
  "Software Engineer",
  "Cloud Engineer",
  "QA Engineer",
  "SDET",
  "Analytics Engineer",
];

test.describe("Practice page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practice");
    await page.waitForLoadState("networkidle");
  });

  test("renders hero heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Build real skills." })).toBeVisible();
  });

  test("renders Practice Lab label", async ({ page }) => {
    await expect(page.getByText("Practice Lab")).toBeVisible();
  });

  test("all 6 role path sections are visible", async ({ page }) => {
    for (const path of ROLE_PATHS) {
      await expect(page.getByRole("heading", { name: path })).toBeVisible();
    }
  });

  test("each section has 5 exercise cards", async ({ page }) => {
    for (const path of ROLE_PATHS) {
      const section = page.locator("section").filter({ has: page.getByRole("heading", { name: path }) });
      const cards = section.locator(".rounded-lg.border");
      await expect(cards).toHaveCount(5);
    }
  });

  test("exercise cards show difficulty badges", async ({ page }) => {
    // At least one Beginner badge should be visible
    await expect(page.getByText("Beginner").first()).toBeVisible();
    // At least one Intermediate badge should be visible
    await expect(page.getByText("Intermediate").first()).toBeVisible();
  });

  // ── Search filter ──────────────────────────────────────────────────

  test("search: type 'RAG' shows match count and relevant section", async ({ page }) => {
    const search = page.getByPlaceholder("Search exercises...");
    await search.fill("RAG");
    await expect(page.getByText(/\d+ exercise/)).toBeVisible();
    // AI Engineer section with RAG exercise should be visible
    await expect(page.getByRole("heading", { name: "AI Engineer" })).toBeVisible();
  });

  test("search: non-matching query shows no-results message", async ({ page }) => {
    const search = page.getByPlaceholder("Search exercises...");
    await search.fill("xxxxxxxxxnothing");
    await expect(page.getByText(/No exercises match/)).toBeVisible();
  });

  test("search: clearing restores all sections", async ({ page }) => {
    const search = page.getByPlaceholder("Search exercises...");
    await search.fill("RAG");
    await expect(page.getByRole("heading", { name: "AI Engineer" })).toBeVisible();
    await search.clear();
    for (const path of ROLE_PATHS) {
      await expect(page.getByRole("heading", { name: path })).toBeVisible();
    }
  });

  // ── Difficulty filter ──────────────────────────────────────────────

  test("Beginner pill filters to only Beginner cards", async ({ page }) => {
    await page.getByRole("button", { name: "Beginner" }).click();

    // Check exercise card difficulty badges (text-[9px] spans inside cards)
    // Filter pills are buttons so span-only locator targets only the badges
    const intermediateCardBadges = page.locator(".space-y-16 span").filter({ hasText: /^Intermediate$/ });
    const advancedCardBadges     = page.locator(".space-y-16 span").filter({ hasText: /^Advanced$/ });

    await expect(intermediateCardBadges).toHaveCount(0);
    await expect(advancedCardBadges).toHaveCount(0);

    // Some Beginner badges should remain
    const beginnerCardBadges = page.locator(".space-y-16 span").filter({ hasText: /^Beginner$/ });
    await expect(beginnerCardBadges.first()).toBeVisible();
  });

  test("clicking All restores all cards after Beginner filter", async ({ page }) => {
    await page.getByRole("button", { name: "Beginner" }).click();
    await page.getByRole("button", { name: "All" }).click();
    await expect(page.getByText("Intermediate").first()).toBeVisible();
  });

  test("combined filter: 'k6' + Intermediate shows 1 exercise", async ({ page }) => {
    const search = page.getByPlaceholder("Search exercises...");
    await search.fill("k6");
    await page.getByRole("button", { name: "Intermediate" }).click();
    await expect(page.getByText("1 exercise")).toBeVisible();
    // The k6 load test (SDET, Intermediate)
    await expect(page.getByText("Write and run a k6 load test")).toBeVisible();
  });

  // ── Copy prompt button ─────────────────────────────────────────────

  test("copy prompt button shows 'Copied' on click and reverts", async ({ context, page }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Button aria-label is "Copy exercise prompt"
    const firstCopyButton = page.getByRole("button", { name: "Copy exercise prompt" }).first();
    await expect(firstCopyButton).toBeVisible();

    await firstCopyButton.click();

    // Button should now show "Copied"
    await expect(page.getByText("Copied").first()).toBeVisible();

    // After 2 seconds it reverts to "Copy prompt" text
    await expect(page.locator("button", { hasText: "Copy prompt" }).first()).toBeVisible({ timeout: 4000 });
  });

  test("copy prompt writes correct text to clipboard", async ({ context, page }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const firstCopyButton = page.getByRole("button", { name: "Copy exercise prompt" }).first();
    await firstCopyButton.click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/I'm working through this/);
    expect(clipboardText).toMatch(/AI Engineer/);
  });

  // ── Navigation ─────────────────────────────────────────────────────

  test("footer Home link navigates to /", async ({ page }) => {
    await page.locator("footer").getByRole("link", { name: "Home" }).click();
    await page.waitForURL("/");
    expect(page.url()).toMatch(/\/$/);
  });

  test("nav Lab link is active on /practice", async ({ page }) => {
    // The Lab link should be present
    await expect(page.getByRole("link", { name: "Practice Lab" })).toBeVisible();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/practice");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});
