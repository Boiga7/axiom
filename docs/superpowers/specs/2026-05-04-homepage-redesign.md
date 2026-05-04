# Homepage Redesign — The Axiom

**Date:** 2026-05-04  
**Status:** Approved  
**Scope:** `app/page.tsx` only — no new routes, no new components unless trivial

---

## Goal

Make the homepage immediately legible to a stranger. Currently too long, too dense, and gives no clear entry point. A new visitor should understand what the site is and know where to go within 5 seconds.

---

## Design

### Hero

- Pill badge: `● Technical Reference · {pageCount} pages` (unchanged)
- Title: "The Axiom" (unchanged)
- Tagline: "A knowledge base for software engineers. AI, cloud, testing, and the engineering fundamentals that tie it all together."
- Two CTAs side by side:
  - Primary: "Start learning →" — `href="#learn-paths"` (scrolls to learning paths)
  - Ghost: "Browse topics" — `href="#browse"` (scrolls to domain rows)

### Learning Paths

- Section heading: "Learning Paths" (unchanged)
- All 6 `LEARNING_PATHS` cards in a 2-column grid (unchanged)
- Each card: topic count + time, title, 1–2 sentence description, "Start →" link
- Card style: keep current `LearningPathCard` component as-is

### Removed

- "In Production" (`TOPIC_BUNDLES`) section removed entirely from the homepage

### Browse by Domain

Replaces the current category card grid. Five rows, one per brain, in `brainOrder` sequence (ai-engineering, research, infrastructure, engineering, intelligence — skip "other" if empty).

Each row:
```
[colour bar] [Brain label]  ·····  [N pages] →
```

- Colour bar: 4px left border or small dot matching `BRAIN_COLORS[brain]`
- Brain label: `BRAIN_LABELS[brain]`, styled with brain colour
- Page count: `cats.reduce((s, c) => s + c.count, 0)` — sum across all categories in that brain
- Entire row is a link. Clicking goes to `/{firstCategorySlug}` for that brain (the first category in `brainOrder` within that brain group), or a `/browse` page if one exists
- No subcategory previews, no nested cards, no page title lists

### Footer

Unchanged.

---

## Files Touched

| File | Change |
|---|---|
| `app/page.tsx` | Full rewrite of JSX — hero tagline, CTAs, remove TOPIC_BUNDLES section, replace category grid with domain rows |
| Nothing else | `LearningPathCard`, `Nav`, `lib/wiki`, `lib/constants` all unchanged |

---

## What Doesn't Change

- Nav, search, graph, scan, career, practice pages — untouched
- `LearningPathCard` component — no edits
- All data sources (`LEARNING_PATHS`, `BRAIN_COLORS`, `BRAIN_LABELS`, `getCategories()`) — no edits
- Mobile layout — 2-col path grid collapses to 1-col on small screens (existing behaviour)

---

## Success Criteria

- Page is no more than 3 viewport heights on a 1440px screen
- A stranger can identify the two entry points (learn / browse) within 5 seconds
- All 6 learning paths visible without more than one scroll
- "In Production" section gone
- Tagline updated
