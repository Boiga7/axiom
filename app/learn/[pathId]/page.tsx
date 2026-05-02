// app/learn/[pathId]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { LEARNING_PATHS } from "@/lib/learning-paths";
import { getPage, getSearchIndex, BRAIN_COLORS, slugToLabel } from "@/lib/wiki";
import Nav from "@/components/Nav";
import type { Metadata } from "next";

type Props = { params: { pathId: string } };

export function generateStaticParams() {
  return LEARNING_PATHS.map((p) => ({ pathId: p.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const path = LEARNING_PATHS.find((p) => p.id === params.pathId);
  if (!path) return {};
  return {
    title: path.title,
    description: path.description,
  };
}

export default function LearnPathPage({ params }: Props) {
  const learningPath = LEARNING_PATHS.find((p) => p.id === params.pathId);
  if (!learningPath) notFound();

  const searchIndex = getSearchIndex();
  const color = BRAIN_COLORS[learningPath.brain as keyof typeof BRAIN_COLORS] ?? "#94a3b8";

  // Resolve each step to a live wiki page (skip steps whose page doesn't exist)
  const resolvedSteps = learningPath.steps
    .map((step) => ({ step, page: getPage(step.category, step.slug) }))
    .filter(({ page }) => page !== undefined) as Array<{
      step: (typeof learningPath.steps)[number];
      page: NonNullable<ReturnType<typeof getPage>>;
    }>;

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pb-24">
        {/* Back */}
        <div className="pt-10 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-muted hover:text-secondary font-mono text-[11px] uppercase tracking-widest transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            The Axiom
          </Link>
        </div>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded"
              style={{ color, background: color + "18" }}
            >
              Learning Path
            </span>
            <span className="font-mono text-[10px] text-muted">
              {resolvedSteps.length} topics · ~{learningPath.estimatedHours}h
            </span>
          </div>

          <h1
            className="font-display text-4xl sm:text-5xl font-semibold text-primary mb-4 leading-[1.1]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {learningPath.title}
          </h1>

          <p className="text-secondary text-[15px] leading-relaxed max-w-2xl">
            {learningPath.description}
          </p>

          <div
            className="mt-6 h-px w-full"
            style={{ background: `linear-gradient(to right, ${color}40, transparent)` }}
          />
        </header>

        {/* Steps */}
        <ol className="flex flex-col gap-4">
          {resolvedSteps.map(({ step, page }, index) => (
            <li key={`${step.category}/${step.slug}`}>
              <Link
                href={page.href}
                className="group flex gap-5 rounded-xl border border-white/[0.06] bg-card px-6 py-5 transition-all duration-150 hover:border-white/[0.12] hover:bg-elevated"
              >
                {/* Step number */}
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-semibold mt-0.5"
                  style={{
                    background: color + "18",
                    color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="font-mono text-[9px] uppercase tracking-widest mb-1"
                        style={{ color: color + "80" }}
                      >
                        {slugToLabel(step.category)}
                      </p>
                      <h2 className="font-display text-base font-semibold text-primary group-hover:text-white transition-colors leading-snug">
                        {page.title}
                      </h2>
                    </div>
                    <svg
                      className="w-4 h-4 text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>

                  {page.excerpt && (
                    <p className="text-secondary text-sm leading-relaxed mt-1.5 line-clamp-2">
                      {page.excerpt}
                    </p>
                  )}

                  {step.note && (
                    <p
                      className="font-mono text-[10px] mt-2"
                      style={{ color: color + "90" }}
                    >
                      ↳ {step.note}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-muted font-mono text-xs">
            {resolvedSteps.length} pages · ~{learningPath.estimatedHours}h estimated reading time
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-xs font-mono text-muted hover:text-secondary transition-colors"
          >
            ← Browse all topics
          </Link>
        </div>
      </main>
    </>
  );
}
