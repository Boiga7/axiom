// app/learn/[pathId]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { LEARNING_PATHS, TOPIC_BUNDLES } from "@/lib/learning-paths";
import { getPage, getSearchIndex, BRAIN_COLORS } from "@/lib/wiki";
import Nav from "@/components/Nav";
import PathSteps from "@/components/PathSteps";
import type { Metadata } from "next";

const ALL_PATHS = [...LEARNING_PATHS, ...TOPIC_BUNDLES];

type Props = { params: { pathId: string } };

export function generateStaticParams() {
  return ALL_PATHS.map((p) => ({ pathId: p.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const path = ALL_PATHS.find((p) => p.id === params.pathId);
  if (!path) return {};
  return {
    title: path.title,
    description: path.description,
  };
}

export default function LearnPathPage({ params }: Props) {
  const learningPath = ALL_PATHS.find((p) => p.id === params.pathId);
  if (!learningPath) return notFound();

  const searchIndex = getSearchIndex();
  const color = BRAIN_COLORS[learningPath.brain as keyof typeof BRAIN_COLORS] ?? "#94a3b8";

  // Resolve each step to a live wiki page (skip steps whose page doesn't exist)
  const resolvedSteps = learningPath.steps
    .map((step) => ({ step, page: getPage(step.category, step.slug) }))
    .filter(({ page }) => page !== undefined) as Array<{
      step: (typeof learningPath.steps)[number];
      page: NonNullable<ReturnType<typeof getPage>>;
    }>;

  const steps = resolvedSteps.map(({ step, page }, index) => ({
    href: page.href,
    title: page.title,
    excerpt: page.excerpt,
    note: step.note,
    category: step.category,
    index,
  }));

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

        <PathSteps
          steps={steps}
          pathId={params.pathId}
          color={color}
          estimatedHours={learningPath.estimatedHours}
        />
      </main>
    </>
  );
}
