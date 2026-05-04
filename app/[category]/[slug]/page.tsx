import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCategories,
  getPagesByCategory,
  getPage,
  getAllPages,
  getSearchIndex,
  BRAIN_COLORS,
  getBrainVar,
  slugToLabel,
} from "@/lib/wiki";
import Nav from "@/components/Nav";
import WikiContent from "@/components/WikiContent";
import TableOfContents from "@/components/TableOfContents";
import ReadingProgress from "@/components/ReadingProgress";
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
  const cats = getCategories();
  const catMeta = cats.find((c) => c.slug === params.category);
  const color = catMeta ? BRAIN_COLORS[catMeta.brain] : "#22d3ee";
  const ogUrl = `/og?title=${encodeURIComponent(page.title)}&category=${encodeURIComponent(slugToLabel(params.category))}&color=${encodeURIComponent(color)}`;
  return {
    title: page.title,
    description: page.excerpt,
    openGraph: {
      title: page.title,
      description: page.excerpt ?? undefined,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.excerpt ?? undefined,
      images: [ogUrl],
    },
  };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function WikiPage({ params }: Props) {
  const { category, slug } = params;
  const page = getPage(category, slug);
  if (!page) return notFound();

  const searchIndex = getSearchIndex();
  const cats = getCategories();
  const catMeta = cats.find((c) => c.slug === category);
  const color = catMeta ? BRAIN_COLORS[catMeta.brain] : "#94a3b8";
  const colorVar = catMeta ? getBrainVar(catMeta.brain) : "#94a3b8";

  // Build wikilink resolution map: basename -> href, full path -> href
  const allPages = getAllPages();
  const hrefMap: Record<string, string> = {};
  for (const p of allPages) {
    hrefMap[p.slug] = p.href;
    hrefMap[`${p.category}/${p.slug}`] = p.href;
  }

  // Related pages — extract wikilinks from content, resolve to pages
  const wikilinkTargets = Array.from(
    page.content
      .replace(/```[\s\S]*?```/g, "")
      .matchAll(/\[\[([^\]|#]+?)(?:\|[^\]]*)?\]\]/g),
    (m) => m[1].trim()
  );
  const related = wikilinkTargets
    .map((link) => {
      const bare = link.includes("/") ? link.split("/").pop()! : link;
      const href = hrefMap[link] ?? hrefMap[bare];
      return href ? allPages.find((p) => p.href === href) : undefined;
    })
    .filter((p): p is NonNullable<typeof p> => !!p && p.slug !== slug)
    .filter((p, i, arr) => arr.findIndex((x) => x.slug === p.slug) === i)
    .slice(0, 5);

  // Sibling pages for the sidebar
  const siblings = getPagesByCategory(category).filter(
    (p) => p.slug !== slug
  );

  return (
    <>
      <ReadingProgress />
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
                style={{ color: colorVar }}
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
                    Updated {formatDate(page.frontmatter.updated)}
                  </span>
                )}
                {page.frontmatter.tags?.length ? (
                  <>
                    <span className="text-white/20">·</span>
                    <div className="flex flex-wrap gap-1.5">
                      {page.frontmatter.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/?q=${encodeURIComponent(tag)}`}
                          className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded transition-opacity hover:opacity-100 opacity-80"
                          style={{
                            color: colorVar,
                            background: color + "15",
                          }}
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </header>

            <WikiContent content={page.content} allPageHrefs={hrefMap} />

            {/* Related reading */}
            {related.length > 0 && (
              <div className="mt-14 pt-8 border-t border-white/[0.06]">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4">
                  Related reading
                </p>
                <div className="flex flex-col gap-0.5">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={r.href}
                      className="group flex items-baseline gap-3 py-1.5"
                    >
                      <span
                        className="font-mono text-[9px] uppercase tracking-widest shrink-0 w-24 truncate"
                        style={{ color: colorVar }}
                      >
                        {slugToLabel(r.category)}
                      </span>
                      <span className="text-sm text-secondary group-hover:text-primary transition-colors">
                        {r.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile: sibling navigation — hidden on lg where sidebar handles it */}
            {siblings.length > 0 && (
              <div className="lg:hidden mt-12 pt-8 border-t border-white/[0.06]">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
                  More in {slugToLabel(category)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {siblings.slice(0, 8).map((s) => (
                    <Link
                      key={s.slug}
                      href={s.href}
                      className="text-xs text-secondary hover:text-primary px-3 py-2 rounded-md border border-white/[0.06] hover:border-white/[0.12] hover:bg-card transition-colors leading-snug truncate"
                    >
                      {s.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar — ToC + sibling pages */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20 flex flex-col gap-8">
              {/* Table of contents */}
              <TableOfContents content={page.content} color={colorVar} />

              {/* Sibling pages */}
              {siblings.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
                    In {slugToLabel(category)}
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    {siblings.slice(0, 10).map((s) => (
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
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
