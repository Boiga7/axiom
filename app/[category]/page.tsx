import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCategories,
  getPagesByCategory,
  getSearchIndex,
  BRAIN_COLORS,
  slugToLabel,
} from "@/lib/wiki";
import Nav from "@/components/Nav";
import type { Metadata } from "next";

type Props = { params: { category: string } };

export async function generateStaticParams() {
  return getCategories().map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: slugToLabel(params.category),
  };
}

export default function CategoryPage({ params }: Props) {
  const { category } = params;
  const pages = getPagesByCategory(category);
  if (!pages.length) notFound();

  const searchIndex = getSearchIndex();
  const cats = getCategories();
  const catMeta = cats.find((c) => c.slug === category);
  const color = catMeta ? BRAIN_COLORS[catMeta.brain] : "#94a3b8";
  const label = slugToLabel(category);

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
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
              href="/"
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
                style={{ background: color }}
              />
              <h1
                className="font-display text-4xl font-semibold text-primary"
                style={{ letterSpacing: "-0.03em" }}
              >
                {label}
              </h1>
            </div>

            <p className="text-secondary font-mono text-sm ml-4">
              {pages.length} {pages.length === 1 ? "page" : "pages"}
            </p>
          </div>
        </section>

        <div className="h-px bg-white/[0.06] mb-10" />

        {/* Page list */}
        <div className="grid gap-2">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={page.href}
              className="group flex items-start gap-4 rounded-lg border border-white/[0.05] bg-card px-5 py-4 transition-all duration-150 hover:border-white/[0.1] hover:bg-elevated min-w-0 overflow-hidden"
            >
              <div
                className="w-0.5 self-stretch rounded-full mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0"
                style={{ background: color }}
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-sm font-semibold text-primary group-hover:text-white transition-colors mb-1">
                  {page.title}
                </h2>
                {page.excerpt && (
                  <p className="text-secondary text-xs leading-relaxed truncate">
                    {page.excerpt}
                  </p>
                )}
                {page.frontmatter.tags?.length ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {page.frontmatter.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          color: color + "cc",
                          background: color + "12",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <svg
                className="w-4 h-4 text-muted shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
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
