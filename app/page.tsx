// app/page.tsx
import Link from "next/link";
import {
  getAllPages,
  getCategories,
  getSearchIndex,
  BRAIN_COLORS,
  BRAIN_LABELS,
  type Brain,
} from "@/lib/wiki";
import { LEARNING_PATHS } from "@/lib/learning-paths";
import Nav from "@/components/Nav";
import LearningPathCard from "@/components/LearningPathCard";

export default function HomePage() {
  const categories = getCategories();
  const allPages = getAllPages();
  const searchIndex = getSearchIndex();

  // Build preview titles per category: first 3 pages alphabetically
  const previewMap: Record<string, string[]> = {};
  for (const page of allPages) {
    if (!previewMap[page.category]) previewMap[page.category] = [];
    if (previewMap[page.category].length < 3) {
      previewMap[page.category].push(page.title);
    }
  }

  const pageCount = allPages.length;
  const categoryCount = categories.length;

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

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
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
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-ae/20 bg-ae/5">
              <div className="w-1.5 h-1.5 rounded-full bg-ae animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ae/80">
                {pageCount} pages · {categoryCount} categories
              </span>
            </div>

            <h1
              className="font-display text-5xl sm:text-6xl font-semibold text-primary mb-4 leading-[1.05]"
              style={{ letterSpacing: "-0.03em" }}
            >
              The Axiom
            </h1>

            <p className="text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-8">
              An AI engineering knowledge base for practitioners — LLMs, agents, RAG,
              evals, infrastructure, and everything in between.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Link
                href="/learn/ai-engineering-fundamentals"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm font-medium transition-all bg-ae/10 text-ae border border-ae/20 hover:bg-ae/20 hover:border-ae/40"
              >
                Start Learning
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="#browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm font-medium transition-all text-secondary border border-white/[0.08] hover:border-white/[0.16] hover:text-primary"
              >
                Browse Topics
              </a>
            </div>
          </div>
        </section>

        {/* ── Learning Paths ───────────────────────────────────── */}
        <section className="mb-16">
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

        {/* ── Browse by topic ──────────────────────────────────── */}
        <div id="browse">
          {brainOrder.map((brain) => {
            const cats = brainGroups[brain];
            if (!cats?.length) return null;
            const color = BRAIN_COLORS[brain];
            const label = BRAIN_LABELS[brain];

            return (
              <section key={brain} className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-1.5 h-6 rounded-full"
                    style={{ background: color }}
                  />
                  <h2
                    className="font-mono text-[11px] uppercase tracking-widest"
                    style={{ color }}
                  >
                    {label}
                  </h2>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="font-mono text-[11px] text-muted">
                    {cats.reduce((s, c) => s + c.count, 0)} pages
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {cats.map((cat) => {
                    const previews = previewMap[cat.slug] ?? [];
                    return (
                      <Link
                        key={cat.slug}
                        href={`/${cat.slug}`}
                        className="group relative block rounded-lg border border-white/[0.06] bg-card p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-elevated"
                      >
                        <div
                          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${color}12 0%, transparent 70%)`,
                          }}
                        />

                        <div className="relative">
                          <p
                            className="font-mono text-[9px] uppercase tracking-widest mb-2"
                            style={{ color: color + "80" }}
                          >
                            {cat.count} pages
                          </p>
                          <h3 className="font-display text-sm font-semibold text-primary leading-tight group-hover:text-white transition-colors mb-3">
                            {cat.label}
                          </h3>
                          {/* Page previews */}
                          {previews.length > 0 && (
                            <ul className="flex flex-col gap-1">
                              {previews.map((title) => (
                                <li
                                  key={title}
                                  className="font-mono text-[9px] text-muted truncate leading-relaxed"
                                >
                                  {title}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity">
                          <svg
                            className="w-3.5 h-3.5"
                            style={{ color }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mt-8 mb-10" />
        <footer className="text-center text-muted font-mono text-[11px] tracking-wider">
          <span>The Axiom · </span>
          <span className="text-ae/60">elliot-digital.co.uk</span>
        </footer>
      </main>
    </>
  );
}
