import Link from "next/link";
import {
  getCategories,
  getSearchIndex,
  BRAIN_COLORS,
  BRAIN_LABELS,
  type Brain,
} from "@/lib/wiki";
import Nav from "@/components/Nav";

export default function HomePage() {
  const categories = getCategories();
  const searchIndex = getSearchIndex();

  // Group by brain
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
        {/* Hero */}
        <section className="pt-20 pb-16 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% -10%, #22d3ee10 0%, transparent 70%)",
            }}
          />

          <div className="relative">
            <div className="mb-4">
              <span className="text-ae font-mono text-[11px] tracking-widest uppercase">
                ⬡ The Axiom
              </span>
            </div>

            <h1
              className="font-display text-5xl sm:text-6xl font-semibold text-primary mb-5 leading-[1.1]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Notes on
              <br />
              <span className="text-ae">building AI.</span>
            </h1>

            <p className="text-secondary text-lg leading-relaxed max-w-xl mb-10">
              Agents, LLMs, RAG, evals, safety, infra. The things worth writing down.
            </p>

          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-14" />

        {/* Brain sections */}
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
                {cats.map((cat) => (
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
                      <h3 className="font-display text-sm font-semibold text-primary leading-tight group-hover:text-white transition-colors">
                        {cat.label}
                      </h3>
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
                ))}
              </div>
            </section>
          );
        })}

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mt-8 mb-10" />
        <footer className="text-center text-muted font-mono text-[11px] tracking-wider">
          <span>The Axiom · </span>
          <span className="text-ae/60">elliot-digital.co.uk</span>
        </footer>
      </main>
    </>
  );
}
