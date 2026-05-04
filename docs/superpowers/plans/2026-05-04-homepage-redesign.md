# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the homepage to hero + learning paths + 5 domain rows, removing the "In Production" section and the category card grid.

**Architecture:** Single file change — `app/page.tsx`. Hero gets updated tagline and two CTAs. `TOPIC_BUNDLES` section removed. Category grid replaced with 5 plain brain-domain rows. All existing components, data sources, and CSS tokens reused — no new files.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, TypeScript. Light/dark mode via `data-theme` on `<html>` — all colours must use CSS variables (`text-primary`, `text-secondary`, `text-muted`, `bg-card`, `border-white/[0.06]`) so they adapt automatically. Avoid hardcoded hex values.

---

## Files

| File | Change |
|---|---|
| `app/page.tsx` | Rewrite JSX — tagline, CTAs, remove TOPIC_BUNDLES, replace card grid with domain rows |

No other files touched.

---

### Task 1: Update tagline and add two CTAs

**Files:**
- Modify: `app/page.tsx` (hero section, lines ~82–94)

- [ ] **Step 1: Replace the tagline text**

Find:
```tsx
<p className="text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-8">
  How AI systems work, fail, and scale. LLMs, agents, RAG, evals,
  and the infrastructure that keeps them running.
</p>
```

Replace with:
```tsx
<p className="text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-8">
  A knowledge base for software engineers. AI, cloud, testing, and the
  engineering fundamentals that tie it all together.
</p>
```

- [ ] **Step 2: Replace the single CTA with two CTAs**

Find:
```tsx
<div className="flex items-center justify-center">
  <a
    href="#browse"
    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm font-medium transition-all text-secondary border border-white/[0.08] hover:border-white/[0.16] hover:text-primary"
  >
    Browse Topics
  </a>
</div>
```

Replace with:
```tsx
<div className="flex items-center justify-center gap-3">
  <a
    href="#learn-paths"
    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm font-medium transition-all bg-ae text-black hover:bg-ae/90"
  >
    Start learning →
  </a>
  <a
    href="#browse"
    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm font-medium transition-all text-secondary border border-white/[0.08] hover:border-white/[0.16] hover:text-primary"
  >
    Browse topics
  </a>
</div>
```

- [ ] **Step 3: Verify in browser — dark mode**

Open `http://localhost:3001`. Confirm:
- New tagline visible
- Two buttons side by side — cyan filled "Start learning →" and ghost "Browse topics"
- "Start learning →" scrolls to learning paths section
- "Browse topics" scrolls to domain section

- [ ] **Step 4: Verify in browser — light mode**

Click the theme toggle. Confirm:
- Tagline readable against light background
- "Start learning →" button still legible (cyan bg with black text works on both modes)
- Ghost button border visible on light bg

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: update homepage tagline and add two-CTA hero"
```

---

### Task 2: Remove the "In Production" section

**Files:**
- Modify: `app/page.tsx` (TOPIC_BUNDLES section, lines ~115–133)

- [ ] **Step 1: Remove the Topic Bundles import**

Find at top of file:
```tsx
import { LEARNING_PATHS, TOPIC_BUNDLES } from "@/lib/learning-paths";
```

Replace with:
```tsx
import { LEARNING_PATHS } from "@/lib/learning-paths";
```

- [ ] **Step 2: Delete the "In Production" JSX block**

Find and delete this entire section (including the surrounding `<section>` tags):
```tsx
{/* ── Topic Bundles ────────────────────────────────────── */}
<section className="mb-16">
  <div className="flex items-center gap-3 mb-2">
    <div className="w-1.5 h-5 rounded-full bg-white/20" />
    <h2 className="font-mono text-[11px] uppercase tracking-widest text-secondary">
      In Production
    </h2>
    <div className="flex-1 h-px bg-white/[0.04]" />
  </div>
  <p className="text-secondary text-xs font-mono mb-6 ml-4">
    How systems behave under real load. Reach for these when something breaks or doesn&apos;t scale
  </p>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {TOPIC_BUNDLES.map((bundle) => (
      <LearningPathCard key={bundle.id} path={bundle} />
    ))}
  </div>
</section>
```

- [ ] **Step 3: Verify in browser**

Confirm "In Production" section is gone. Learning paths section goes straight to domain browse section below it.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: remove In Production section from homepage"
```

---

### Task 3: Replace category card grid with domain rows

**Files:**
- Modify: `app/page.tsx` (Browse by topic section, lines ~135–231)

- [ ] **Step 1: Remove unused variables from page component**

The `previewMap` and `sortedPages` variables are only used in the card grid. Remove them:

Find and delete:
```tsx
// Build preview titles per category: first 3 pages alphabetically
const sortedPages = [...allPages].sort((a, b) => a.title.localeCompare(b.title));
const previewMap: Record<string, string[]> = {};
for (const page of sortedPages) {
  if (!previewMap[page.category]) previewMap[page.category] = [];
  if (previewMap[page.category].length < 3) {
    previewMap[page.category].push(page.title);
  }
}
```

- [ ] **Step 2: Replace the card grid JSX with domain rows**

Find the entire `{brainOrder.map((brain) => { ... })}` block inside `<div id="browse">` and replace it with:

```tsx
{brainOrder.map((brain) => {
  const cats = brainGroups[brain];
  if (!cats?.length) return null;
  const color = BRAIN_COLORS[brain];
  const label = BRAIN_LABELS[brain];
  const total = cats.reduce((s, c) => s + c.count, 0);
  const firstSlug = cats[0].slug;

  return (
    <Link
      key={brain}
      href={`/${firstSlug}`}
      className="group flex items-center gap-4 py-4 border-b border-white/[0.04] hover:border-white/[0.08] transition-colors"
    >
      <div
        className="w-1 h-5 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span
        className="font-mono text-sm font-medium flex-1 transition-colors"
        style={{ color }}
      >
        {label}
      </span>
      <span className="font-mono text-[11px] text-muted group-hover:text-secondary transition-colors">
        {total} pages
      </span>
      <svg
        className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-60 transition-opacity"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </Link>
  );
})}
```

- [ ] **Step 3: Update the browse section heading**

Find:
```tsx
<div className="flex items-center gap-3 mb-10">
  <div className="w-1.5 h-5 rounded-full bg-white/10" />
  <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
    Browse by domain
  </h2>
  <div className="flex-1 h-px bg-white/[0.04]" />
  <span className="font-mono text-[11px] text-muted">{pageCount} pages</span>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-3 mb-6">
  <div className="w-1.5 h-5 rounded-full bg-white/10" />
  <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
    Browse by domain
  </h2>
  <div className="flex-1 h-px bg-white/[0.04]" />
  <span className="font-mono text-[11px] text-muted">{pageCount} pages</span>
</div>
```

(Just reduces `mb-10` to `mb-6` — the rows have their own padding now.)

- [ ] **Step 4: Verify in browser — dark mode**

Confirm:
- Five domain rows visible: AI Engineering, Research, Infrastructure, Engineering, Intelligence
- Each row shows coloured label + page count + arrow on hover
- No subcategory card grid
- Page is visibly shorter than before

- [ ] **Step 5: Verify in browser — light mode**

Toggle to light mode. Confirm:
- Row borders visible on light background
- Coloured labels legible (cyan, blue, purple, green, orange all contrast on white)
- Arrow appears on hover
- No contrast issues

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace category card grid with domain rows on homepage"
```

---

### Task 4: Full page review and deploy

- [ ] **Step 1: Dark mode — scroll full page**

At `http://localhost:3001` in dark mode:
- Hero: new tagline, two CTAs
- Learning Paths: all 6 cards with descriptions
- No "In Production" section
- 5 domain rows
- Page height roughly 3 viewport heights at 1440px wide

- [ ] **Step 2: Light mode — scroll full page**

Toggle light mode. Check same items. Specific checks:
- "Start learning →" button: cyan bg + black text readable on light bg ✓
- Ghost button border visible on light bg ✓
- Domain row borders visible ✓
- Coloured brain labels readable ✓

- [ ] **Step 3: Mobile — 375px width**

Use browser devtools to set 375px width. Confirm:
- Path cards collapse to 1 column
- Domain rows still readable (label may truncate — ensure `flex-1` gives enough room)
- Both CTAs still visible (may stack — add `flex-wrap` if needed)

If CTAs stack awkwardly at 375px, change their container to:
```tsx
<div className="flex flex-wrap items-center justify-center gap-3">
```

- [ ] **Step 4: Copy wiki and deploy**

```bash
cd "C:\Users\lewis\OneDrive\Desktop\Claude MD\axiom"
node scripts/copy-wiki.mjs
vercel --prod --yes --scope boiga7s-projects
vercel alias set <deployment-url> elliot-digital.co.uk --scope boiga7s-projects
```

- [ ] **Step 5: Final commit**

```bash
git add app/page.tsx
git commit -m "chore: homepage redesign complete — tagline, CTAs, domain rows"
git push origin main
```
