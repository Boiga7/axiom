// app/browse/[brain]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCategories,
  getSearchIndex,
  BRAIN_COLORS,
  BRAIN_LABELS,
  getBrainVar,
  type Brain,
} from "@/lib/wiki";
import Nav from "@/components/Nav";
import type { Metadata } from "next";

type Props = { params: { brain: string } };

const BRAIN_ORDER: Brain[] = [
  "ai-engineering",
  "research",
  "infrastructure",
  "engineering",
  "intelligence",
];

export function generateStaticParams() {
  return BRAIN_ORDER.map((brain) => ({ brain }));
}

export function generateMetadata({ params }: Props): Metadata {
  const label = BRAIN_LABELS[params.brain as Brain];
  return { title: label ? `${label} — The Axiom` : "Browse" };
}

export default function BrainPage({ params }: Props) {
  const brain = params.brain as Brain;
  if (!BRAIN_ORDER.includes(brain)) return notFound();

  const color = BRAIN_COLORS[brain];
  const colorVar = getBrainVar(brain);
  const label = BRAIN_LABELS[brain];
  const searchIndex = getSearchIndex();

  const categories = getCategories().filter((c) => c.brain === brain);
  if (!categories.length) return notFound();

  const totalPages = categories.reduce((s, c) => s + c.count, 0);

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        {/* Header */}
        <section className="pt-14 pb-10 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 50% 60% at 0% 50%, ${color}08 0%, transparent 70%)`,
            }}
          />

          <div className="relative">
            <Link
              href="/#browse"
              className="inline-flex items-center gap-1.5 text-muted hover:text-secondary font-mono text-[11px] uppercase tracking-widest mb-6 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              The Axiom
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-1 h-8 rounded-full"
                style={{ background: colorVar }}
              />
              <h1
                className="font-display text-4xl font-semibold text-primary"
                style={{ letterSpacing: "-0.03em" }}
              >
                {label}
              </h1>
            </div>

            <p className="text-secondary font-mono text-sm ml-4">
              {totalPages} pages across {categories.length} {categories.length === 1 ? "category" : "categories"}
            </p>
          </div>
        </section>

        {/* Category buttons — same pattern as homepage brain rows */}
        <div className="grid gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="group flex items-center gap-4 px-5 py-4 rounded-lg border border-white/[0.06] bg-card hover:border-white/[0.12] hover:bg-elevated transition-all duration-150"
            >
              <div
                className="w-1 h-6 rounded-full flex-shrink-0"
                style={{ background: colorVar }}
              />
              <span className="font-mono text-sm font-medium flex-1 text-primary group-hover:text-white transition-colors">
                {cat.label}
              </span>
              <span className="font-mono text-xs text-muted group-hover:text-secondary transition-colors">
                {cat.count} pages
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
          ))}
        </div>
      </main>
    </>
  );
}
