import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  BRAIN_MAP,
  BRAIN_LABELS,
  BRAIN_COLORS,
  slugToLabel,
  type Brain,
  type WikiFrontmatter,
  type WikiPage,
  type Category,
  type SearchEntry,
} from "./constants";

export {
  BRAIN_MAP,
  BRAIN_LABELS,
  BRAIN_COLORS,
  slugToLabel,
  type Brain,
  type WikiFrontmatter,
  type WikiPage,
  type Category,
  type SearchEntry,
};

// In production (Vercel) the wiki is copied into ./content/wiki at build time.
// In local dev it reads directly from the Nexus vault next door.
const LOCAL_WIKI = path.join(process.cwd(), "..", "Nexus", "wiki");
const BUNDLED_WIKI = path.join(process.cwd(), "content", "wiki");
const WIKI_ROOT = fs.existsSync(BUNDLED_WIKI) ? BUNDLED_WIKI : LOCAL_WIKI;

const EXCLUDED = new Set(["experiments", "para"]);

function extractExcerpt(content: string, maxLen = 160): string {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.startsWith("#") &&
        !l.startsWith(">") &&
        !l.startsWith("---") &&
        !l.startsWith("```") &&
        !l.startsWith("|")
    );
  const first = lines[0] ?? "";
  return first.length > maxLen ? first.slice(0, maxLen) + "…" : first;
}

function deriveTitle(content: string, slug: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return slugToLabel(slug);
}

let _cache: WikiPage[] | null = null;

export function getAllPages(): WikiPage[] {
  if (_cache) return _cache;

  const pages: WikiPage[] = [];
  if (!fs.existsSync(WIKI_ROOT)) return pages;

  const categories = fs
    .readdirSync(WIKI_ROOT)
    .filter((entry) => {
      const full = path.join(WIKI_ROOT, entry);
      return fs.statSync(full).isDirectory() && !EXCLUDED.has(entry);
    });

  for (const category of categories) {
    const catDir = path.join(WIKI_ROOT, category);
    const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(catDir, file), "utf-8");

      let data: Record<string, unknown> = {};
      let content = raw;
      try {
        const parsed = matter(raw);
        // js-yaml parses YYYY-MM-DD as Date objects — stringify them
        data = JSON.parse(
          JSON.stringify(parsed.data, (_, v) =>
            v instanceof Date ? v.toISOString().slice(0, 10) : v
          )
        );
        content = parsed.content;
      } catch {
        // Strip frontmatter manually if YAML is malformed
        const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
        if (fmMatch) content = fmMatch[1];
      }

      pages.push({
        slug,
        category,
        title: deriveTitle(content, slug),
        content,
        frontmatter: data as WikiFrontmatter,
        excerpt: extractExcerpt(content),
        href: `/${category}/${slug}`,
      });
    }
  }

  _cache = pages;
  return pages;
}

export function getCategories(): Category[] {
  const pages = getAllPages();
  const counts: Record<string, number> = {};
  for (const p of pages) {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([slug, count]) => ({
      slug,
      label: slugToLabel(slug),
      brain: BRAIN_MAP[slug] ?? ("other" as Brain),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function getPagesByCategory(category: string): WikiPage[] {
  return getAllPages()
    .filter((p) => p.category === category)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getPage(
  category: string,
  slug: string
): WikiPage | undefined {
  return getAllPages().find(
    (p) => p.category === category && p.slug === slug
  );
}

export function getSearchIndex(): SearchEntry[] {
  return getAllPages().map((p) => ({
    title: p.title,
    category: p.category,
    slug: p.slug,
    href: p.href,
    excerpt: p.excerpt,
    tags: p.frontmatter.tags ?? [],
  }));
}
