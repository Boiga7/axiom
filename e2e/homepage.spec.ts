import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("renders h1 and page count badge", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "The Axiom" })).toBeVisible();
    await expect(page.locator("text=AI Engineering Reference")).toBeVisible();
  });

  test("nav: logo links to home", async ({ page }) => {
    const logo = page.getByRole("link", { name: "The Axiom" });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("href", "/");
  });

  test("nav: Lab link points to /practice", async ({ page }) => {
    const labLink = page.getByRole("link", { name: "Practice Lab" });
    await expect(labLink).toBeVisible();
    await expect(labLink).toHaveAttribute("href", "/practice");
  });

  test("nav: search input is present", async ({ page }) => {
    await expect(page.getByRole("searchbox").or(page.getByPlaceholder(/search/i))).toBeVisible();
  });

  test("nav: Home, Graph, Scan links present", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Graph" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Scan" })).toBeVisible();
  });

  test("Learning Paths section renders", async ({ page }) => {
    await expect(page.getByText("Learning Paths")).toBeVisible();
    // At least one learning path card is present
    const cards = page.locator("a[href^='/learn/']");
    await expect(cards.first()).toBeVisible();
  });

  test("Browse by domain section renders category cards", async ({ page }) => {
    await expect(page.getByText("Browse by domain")).toBeVisible();
    // Category cards link to /<category>
    const categoryCards = page.locator("main a[href^='/agents'], main a[href^='/llms'], main a[href^='/rag']");
    await expect(categoryCards.first()).toBeVisible();
  });

  test("clicking a category card navigates to category page", async ({ page }) => {
    const agentsCard = page.locator("main a[href='/agents']");
    await expect(agentsCard).toBeVisible();
    await agentsCard.click();
    await page.waitForURL("**/agents");
    expect(page.url()).toContain("/agents");
  });

  test("footer links present", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Graph" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Scan" })).toBeVisible();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});
