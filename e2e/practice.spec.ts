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

  const EXERCISE_COUNTS: Record<string, number> = {
    "AI Engineer": 9,
    "Software Engineer": 8,
    "Cloud Engineer": 8,
    "QA Engineer": 8,
    "SDET": 8,
    "Analytics Engineer": 8,
  };

  test("each section has the correct exercise card count", async ({ page }) => {
    for (const path of ROLE_PATHS) {
      const section = page.locator("section").filter({ has: page.getByRole("heading", { name: path }) });
      const cards = section.locator("a.rounded-lg");
      await expect(cards).toHaveCount(EXERCISE_COUNTS[path]);
    }
  });

  test("exercise cards show difficulty badges", async ({ page }) => {
    await expect(page.getByText("Beginner").first()).toBeVisible();
    await expect(page.getByText("Intermediate").first()).toBeVisible();
  });

  test("exercise cards show Start link", async ({ page }) => {
    const startLinks = page.getByText("Start");
    await expect(startLinks.first()).toBeVisible();
  });

  // ── Search filter ──────────────────────────────────────────────────

  test("search: type 'RAG' shows match count and relevant section", async ({ page }) => {
    const search = page.getByPlaceholder("Search exercises...");
    await search.fill("RAG");
    await expect(page.getByText(/\d+ exercise/)).toBeVisible();
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

    const intermediateCardBadges = page.locator(".space-y-16 span").filter({ hasText: /^Intermediate$/ });
    const advancedCardBadges     = page.locator(".space-y-16 span").filter({ hasText: /^Advanced$/ });

    await expect(intermediateCardBadges).toHaveCount(0);
    await expect(advancedCardBadges).toHaveCount(0);

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
    await expect(page.getByText("Write and run a k6 load test")).toBeVisible();
  });

  // ── Card navigation ────────────────────────────────────────────────

  test("clicking an exercise card navigates to its exercise page", async ({ page }) => {
    const firstCard = page.locator("a.rounded-lg").first();
    await firstCard.click();
    await page.waitForURL(/\/practice\/.+\/.+/);
    expect(page.url()).toMatch(/\/practice\/ai-engineer\/rag-pipeline/);
  });

  // ── Navigation ─────────────────────────────────────────────────────

  test("footer Home link navigates to /", async ({ page }) => {
    await page.locator("footer").getByRole("link", { name: "Home" }).click();
    await page.waitForURL("/");
    expect(page.url()).toMatch(/\/$/);
  });

  test("nav Lab link is active on /practice", async ({ page }) => {
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

// ── Exercise page ────────────────────────────────────────────────────

test.describe("Exercise page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practice/ai-engineer/rag-pipeline");
    await page.waitForLoadState("networkidle");
  });

  test("renders exercise title as h1", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: /Build a RAG pipeline from scratch/i })).toBeVisible();
  });

  test("shows difficulty badge", async ({ page }) => {
    await expect(page.getByText("Beginner").first()).toBeVisible();
  });

  test("shows role path breadcrumb", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation");
    await expect(breadcrumb.getByRole("link", { name: "Practice Lab" })).toBeVisible();
    await expect(breadcrumb.getByText("AI Engineer")).toBeVisible();
  });

  test("shows Why this matters section", async ({ page }) => {
    await expect(page.getByText("Why this matters")).toBeVisible();
  });

  test("shows Before you start section with prerequisites", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
    // RAG exercise has 4 prereqs
    const prereqs = page.locator("ul").filter({ has: page.getByText(/Python basics/) }).locator("li");
    await expect(prereqs).toHaveCount(4);
  });

  test("shows step-by-step guide with numbered steps", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Step-by-step guide" })).toBeVisible();
    // RAG exercise has 6 steps
    const steps = page.locator("ol li");
    await expect(steps).toHaveCount(6);
  });

  test("shows Relevant Axiom pages section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Relevant Axiom pages" })).toBeVisible();
    await expect(page.getByRole("link", { name: "RAG pipeline overview" })).toBeVisible();
  });

  test("shows What to do next section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "What to do next" })).toBeVisible();
  });

  test("Back to Practice Lab link navigates back", async ({ page }) => {
    await page.locator("main").getByRole("link", { name: /Back to Practice Lab/i }).click();
    await page.waitForURL("/practice");
    expect(page.url()).toMatch(/\/practice$/);
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/practice/ai-engineer/rag-pipeline");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("invalid exercise path returns 404", async ({ page }) => {
    const response = await page.goto("/practice/ai-engineer/does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("invalid role path returns 404", async ({ page }) => {
    const response = await page.goto("/practice/does-not-exist/rag-pipeline");
    expect(response?.status()).toBe(404);
  });
});

// ── Software Engineer exercise page ──────────────────────────────────

test.describe("Software Engineer exercise page — refactor-god-class", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practice/software-engineer/refactor-god-class");
    await page.waitForLoadState("networkidle");
  });

  test("renders exercise title", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: /Refactor a God class using SOLID/i })).toBeVisible();
  });

  test("shows Beginner difficulty badge", async ({ page }) => {
    await expect(page.getByText("Beginner").first()).toBeVisible();
  });

  test("shows Software Engineer in breadcrumb", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation");
    await expect(breadcrumb.getByText("Software Engineer")).toBeVisible();
  });

  test("shows 5 steps", async ({ page }) => {
    const steps = page.locator("ol li");
    await expect(steps).toHaveCount(5);
  });

  test("links to SOLID axiom page", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Software design principles/i })).toBeVisible();
  });
});

// ── QA Engineer exercise page ─────────────────────────────────────────

test.describe("QA Engineer exercise page — test-charters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practice/qa-engineer/test-charters");
    await page.waitForLoadState("networkidle");
  });

  test("renders exercise title", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: /Write and execute test charters/i })).toBeVisible();
  });

  test("shows Beginner difficulty badge", async ({ page }) => {
    await expect(page.getByText("Beginner").first()).toBeVisible();
  });

  test("shows QA Engineer in breadcrumb", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation");
    await expect(breadcrumb.getByText("QA Engineer")).toBeVisible();
  });

  test("shows 5 steps", async ({ page }) => {
    const steps = page.locator("ol li");
    await expect(steps).toHaveCount(5);
  });

  test("links to exploratory testing axiom page", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Exploratory testing" })).toBeVisible();
  });
});

// ── SDET exercise page ────────────────────────────────────────────────

test.describe("SDET exercise page — streaming-endpoint-test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practice/sdet/streaming-endpoint-test");
    await page.waitForLoadState("networkidle");
  });

  test("renders exercise title", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: /Test a streaming LLM endpoint with Playwright/i })).toBeVisible();
  });

  test("shows Intermediate difficulty badge", async ({ page }) => {
    await expect(page.getByText("Intermediate").first()).toBeVisible();
  });

  test("shows SDET in breadcrumb", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation");
    await expect(breadcrumb.getByText("SDET")).toBeVisible();
  });

  test("shows 5 steps", async ({ page }) => {
    const steps = page.locator("ol li");
    await expect(steps).toHaveCount(5);
  });
});

// ── Analytics Engineer exercise page ─────────────────────────────────

test.describe("Analytics Engineer exercise page — window-function-query", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practice/analytics-engineer/window-function-query");
    await page.waitForLoadState("networkidle");
  });

  test("renders exercise title", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: /Write a window function ranking query/i })).toBeVisible();
  });

  test("shows Beginner difficulty badge", async ({ page }) => {
    await expect(page.getByText("Beginner").first()).toBeVisible();
  });

  test("shows Analytics Engineer in breadcrumb", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation");
    await expect(breadcrumb.getByText("Analytics Engineer")).toBeVisible();
  });

  test("shows 5 steps", async ({ page }) => {
    const steps = page.locator("ol li");
    await expect(steps).toHaveCount(5);
  });

  test("links to SQL fundamentals axiom page", async ({ page }) => {
    await expect(page.getByRole("link", { name: "SQL fundamentals" })).toBeVisible();
  });
});
