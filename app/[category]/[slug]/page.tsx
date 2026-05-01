import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCategories,
  getPagesByCategory,
  getPage,
  getAllPages,
  getSearchIndex,
  BRAIN_COLORS,
  slugToLabel,
} from "@/lib/wiki";
import Nav from "@/components/Nav";
import WikiContent from "@/components/WikiContent";
import type { Metadata } from "next";

type Props = { params: { category: string; slug: string } };

export async function generateStaticParams() {
  const all = getCategories().flatMap((cat) =>
    getPagesByCategory(cat.slug).map((page) => ({
      category: cat.slug,
      slug: page.slug,
    }))
  );
  return all;
}

export function generateMetadata({ params }: Props): Metadata {
  const page = getPage(params.category, params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.excerpt,
  };
}

export default function WikiPage({ params }: Props) {
  const { category, slug } = params;
  const page = getPage(category, slug);
  if (!page) notFound();

  const searchIndex = getSearchIndex();
  const cats = getCategories();
  const catMeta = cats.find((c) => c.slug === category);
  const color = catMeta ? BRAIN_COLORS[catMeta.brain] : "#94a3b8";

  // Build wikilink resolution map: basename -> href, full path -> href
  const allPages = getAllPages();
  const hrefMap: Record<string, string> = {};
  for (const p of allPages) {
    hrefMap[p.slug] = p.href;
    hrefMap[`${p.category}/${p.slug}`] = p.href;
  }

  // Sibling pages for the sidebar
  const siblings = getPagesByCategory(category).filter(
    (p) => p.slug !== slug
  );

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="flex gap-10 pt-10">
          {/* Main content */}
          <article className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 mb-8 font-mono text-[11px] uppercase tracking-widest text-muted">
              <Link href="/" className="hover:text-secondary transition-colors">
                Axiom
              </Link>
              <span>/</span>
              <Link
                href={`/${category}`}
                className="hover:text-secondary transition-colors"
                style={{ color: color + "cc" }}
              >
                {slugToLabel(category)}
              </Link>
              <span>/</span>
              <span className="text-secondary truncate">{page.title}</span>
            </nav>

            {/* Page header */}
            <header className="mb-10 pb-8 border-b border-white/[0.06]">
              <h1
                className="font-display text-4xl sm:text-5xl font-semibold text-primary mb-4 leading-[1.1]"
                style={{ letterSpacing: "-0.03em" }}
              >
                {page.title}
              </h1>

              {/* TL;DR summary */}
              {typeof page.frontmatter.tldr === "string" && (
                <p className="text-secondary text-[15px] leading-relaxed mb-5 max-w-2xl">
                  {page.frontmatter.tldr}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                {page.frontmatter.updated && (
                  <span className="font-mono text-[11px] text-muted">
                    Updated {page.frontmatter.updated}
                  </span>
                )}
                {page.frontmatter.tags?.length ? (
                  <>
                    <span className="text-white/20">·</span>
                    <div className="flex flex-wrap gap-1.5">
                      {page.frontmatter.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{
                            color: color + "cc",
                            background: color + "15",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </header>

            <WikiContent content={page.content} allPageHrefs={hrefMap} />
          </article>

          {/* Sidebar — sibling pages */}
          {siblings.length > 0 && (
            <aside className="hidden lg:block w-60 shrink-0">
              <div className="sticky top-20">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
                  In {slugToLabel(category)}
                </p>
                <nav className="flex flex-col gap-0.5">
                  {siblings.map((s) => (
                    <Link
                      key={s.slug}
                      href={s.href}
                      className="text-xs text-secondary hover:text-primary px-2.5 py-1.5 rounded-md hover:bg-card transition-colors leading-snug"
                    >
                      {s.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
