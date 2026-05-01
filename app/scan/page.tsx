import { getAllPages, getCategories, getSearchIndex, BRAIN_COLORS, BRAIN_MAP, slugToLabel } from "@/lib/wiki";
import Nav from "@/components/Nav";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Scan" };

function extractWikilinks(content: string): string[] {
  const matches = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  return [...matches].map((m) => {
    const raw = m[1].trim();
    return raw.includes("/") ? raw.split("/").pop()! : raw;
  });
}

export default function ScanPage() {
  const allPages = getAllPages();
  const categories = getCategories();
  const searchIndex = getSearchIndex();

  const slugSet = new Set(allPages.map((p) => p.slug));

  // 1. Broken wikilinks — link targets that don't exist
  const broken: { from: string; fromHref: string; target: string }[] = [];
  for (const page of allPages) {
    for (const target of extractWikilinks(page.content)) {
      if (!slugSet.has(target)) {
        broken.push({ from: page.title, fromHref: page.href, target });
      }
    }
  }
  // Deduplicate by target
  const brokenByTarget = new Map<string, string[]>();
  for (const { target, from } of broken) {
    if (!brokenByTarget.has(target)) brokenByTarget.set(target, []);
    brokenByTarget.get(target)!.push(from);
  }

  // 2. Orphan pages — no inbound wikilinks
  const inboundCount = new Map<string, number>();
  for (const page of allPages) {
    for (const target of extractWikilinks(page.content)) {
      inboundCount.set(target, (inboundCount.get(target) ?? 0) + 1);
    }
  }
  const orphans = allPages.filter((p) => !inboundCount.has(p.slug));

  // 3. Thin categories — fewer than 3 pages
  const thin = categories.filter((c) => c.count < 3);

  // 4. Pages with no tags
  const noTags = allPages.filter(
    (p) => !p.frontmatter.tags || p.frontmatter.tags.length === 0
  );

  const sections = [
    {
      id: "broken",
      label: "Missing pages",
      description: "Wikilinks that point to pages that don't exist yet.",
      color: "#f87171",
      count: brokenByTarget.size,
      content: (
        <ul className="flex flex-col gap-2">
          {[...brokenByTarget.entries()].slice(0, 30).map(([target, sources]) => (
            <li key={target} className="flex items-start gap-3">
              <span className="font-mono text-xs text-[#f87171] mt-0.5">[[{target}]]</span>
              <span className="text-xs text-muted">
                linked from {sources.slice(0, 3).join(", ")}
                {sources.length > 3 ? ` +${sources.length - 3} more` : ""}
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "orphans",
      label: "Orphan pages",
      description: "Pages with no inbound links from anywhere else in the vault.",
      color: "#fb923c",
      count: orphans.length,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {orphans.map((p) => (
            <Link
              key={p.slug}
              href={p.href}
              className="text-xs text-secondary hover:text-primary font-mono truncate transition-colors"
            >
              {p.title}
            </Link>
          ))}
        </div>
      ),
    },
    {
      id: "thin",
      label: "Thin categories",
      description: "Categories with fewer than 3 pages — candidates for expansion.",
      color: "#facc15",
      count: thin.length,
      content: (
        <div className="flex flex-col gap-2">
          {thin.map((cat) => {
            const brain = BRAIN_MAP[cat.slug] ?? "other";
            const color = BRAIN_COLORS[brain as keyof typeof BRAIN_COLORS];
            return (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-1 h-4 rounded-full" style={{ background: color }} />
                <span className="text-xs text-secondary group-hover:text-primary transition-colors">
                  {slugToLabel(cat.slug)}
                </span>
                <span className="font-mono text-[10px] text-muted">{cat.count} pages</span>
              </Link>
            );
          })}
        </div>
      ),
    },
    {
      id: "notags",
      label: "Pages without tags",
      description: "Pages missing frontmatter tags — harder to discover via search.",
      color: "#a78bfa",
      count: noTags.length,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {noTags.map((p) => (
            <Link
              key={p.slug}
              href={p.href}
              className="text-xs text-secondary hover:text-primary font-mono truncate transition-colors"
            >
              {p.title}
            </Link>
          ))}
        </div>
      ),
    },
  ];

  const totalIssues = brokenByTarget.size + orphans.length + thin.length + noTags.length;

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 pb-24 pt-12">
        <div className="mb-10">
          <h1
            className="font-display text-3xl font-semibold text-primary mb-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            Vault scan
          </h1>
          <p className="text-secondary text-sm font-mono">
            {allPages.length} pages · {totalIssues} things worth looking at
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.id} className="rounded-lg border border-white/[0.06] bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                <div
                  className="w-1.5 h-6 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-sm font-semibold text-primary">{s.label}</h2>
                  <p className="text-muted text-xs mt-0.5">{s.description}</p>
                </div>
                <span
                  className="font-mono text-sm font-semibold shrink-0"
                  style={{ color: s.color }}
                >
                  {s.count}
                </span>
              </div>
              {s.count > 0 ? (
                <div className="px-5 py-4">{s.content}</div>
              ) : (
                <div className="px-5 py-4 text-muted font-mono text-xs">All clear.</div>
              )}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
