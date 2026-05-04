// app/page.tsx
import Link from "next/link";
import {
  getAllPages,
  getCategories,
  getSearchIndex,
  BRAIN_LABELS,
  getBrainVar,
  type Brain,
} from "@/lib/wiki";
import { LEARNING_PATHS } from "@/lib/learning-paths";
import Nav from "@/components/Nav";
import LearningPathCard from "@/components/LearningPathCard";

export default function HomePage() {
  const categories = getCategories();
  const allPages = getAllPages();
  const searchIndex = getSearchIndex();

  const pageCount = allPages.length;

  // Group categories by brain
  const brainGroups = categories.reduce<Record<string, typeof categories>>(
    (acc, cat) => {
      const b = cat.brain;
      if (!acc[b]) acc[b] = [];
      acc[b].push(cat);
      return acc;
    },
    {}
  );

  const brainOrder: Brain[] = [
    "ai-engineering",
    "research",
    "infrastructure",
    "engineering",
    "intelligence",
    "other",
  ];

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="pt-16 pb-14 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(34,211,238,0.07) 0%, transparent 70%)",
            }}
          />

          <div className="relative text-center">
            <h1
              className="font-display text-5xl sm:text-6xl font-semibold text-primary mb-4 leading-[1.05]"
              style={{ letterSpacing: "-0.03em" }}
            >
              The Axiom
            </h1>

            <p className="text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-6">
              A technical reference covering AI engineering, cloud infrastructure, testing, and software fundamentals.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ae/20 bg-ae/5">
              <div className="w-1.5 h-1.5 rounded-full bg-ae animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ae/80">
                Live knowledge base · {pageCount} pages
              </span>
            </div>
          </div>
        </section>

        {/* ── Role-Based Learning Paths ───────────────────────── */}
        <section className="mb-16" id="learn-paths">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-5 rounded-full bg-ae/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-ae/80">
              Learning Paths
            </h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LEARNING_PATHS.map((path) => (
              <LearningPathCard key={path.id} path={path} />
            ))}
          </div>
        </section>

        {/* ── Browse by domain ─────────────────────────────────── */}
        <div id="browse">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 rounded-full bg-white/20" />
            <h2 className="font-mono text-sm font-medium text-secondary tracking-wide">
              Browse by domain
            </h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
            <span className="font-mono text-[11px] text-muted">{pageCount} pages</span>
          </div>

          <div className="grid gap-2">
          {brainOrder.map((brain) => {
            const cats = brainGroups[brain];
            if (!cats?.length) return null;
            const colorVar = getBrainVar(brain);
            const label = BRAIN_LABELS[brain];
            const total = cats.reduce((s, c) => s + c.count, 0);

            return (
              <Link
                key={brain}
                href={`/browse/${brain}`}
                className="group flex items-center gap-4 px-5 py-4 rounded-lg border border-white/[0.06] bg-card hover:border-white/[0.12] hover:bg-elevated transition-all duration-150"
              >
                <div
                  className="w-1 h-6 rounded-full flex-shrink-0"
                  style={{ background: colorVar }}
                />
                <span
                  className="font-mono text-sm font-medium flex-1"
                  style={{ color: colorVar }}
                >
                  {label}
                </span>
                <span className="font-mono text-xs text-muted group-hover:text-secondary transition-colors">
                  {total} pages
                </span>
                <svg
                  className="w-4 h-4 text-muted opacity-0 group-hover:opacity-60 transition-opacity"
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
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mt-8 mb-10" />
        <footer className="flex items-center justify-center gap-4 text-muted font-mono text-[11px] tracking-wider pb-2">
          <Link href="/" className="hover:text-secondary transition-colors">Home</Link>
          <span className="text-white/10">·</span>
          <Link href="/graph" className="hover:text-secondary transition-colors">Graph</Link>
          <span className="text-white/10">·</span>
          <Link href="/scan" className="hover:text-secondary transition-colors">Scan</Link>
          <span className="text-white/10">·</span>
          <span className="text-ae/40">elliot-digital.co.uk</span>
        </footer>
      </main>
    </>
  );
}
