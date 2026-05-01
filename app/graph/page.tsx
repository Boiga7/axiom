import { getAllPages, getSearchIndex, BRAIN_COLORS, BRAIN_MAP } from "@/lib/wiki";
import Nav from "@/components/Nav";
import GraphView from "@/components/GraphView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Graph" };

// Extract wikilink targets from markdown content (strips code blocks to avoid false positives)
function extractLinks(content: string): string[] {
  const stripped = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");
  const matches = stripped.matchAll(/\[\[([a-zA-Z0-9_/-]+)(?:\|[^\]]+)?\]\]/g);
  return [...matches].map((m) => {
    const raw = m[1].trim();
    return raw.includes("/") ? raw.split("/").pop()! : raw;
  });
}

export default function GraphPage() {
  const allPages = getAllPages();
  const searchIndex = getSearchIndex();

  // Build slug -> page map for link resolution
  const slugMap = new Map(allPages.map((p) => [p.slug, p]));

  // Build nodes
  const nodes = allPages.map((p) => {
    const brain = (BRAIN_MAP[p.category] ?? "other") as keyof typeof BRAIN_COLORS;
    const color = BRAIN_COLORS[brain];
    // Node size based on content length (proxy for richness)
    const val = Math.min(Math.max(p.content.length / 500, 1), 8);
    return {
      id: p.slug,
      label: p.title,
      category: p.category,
      href: p.href,
      color,
      val,
    };
  });

  // Build edges from wikilinks
  const edgeSet = new Set<string>();
  const links: { source: string; target: string }[] = [];

  for (const page of allPages) {
    const targets = extractLinks(page.content);
    for (const target of targets) {
      const resolved = slugMap.get(target);
      if (!resolved || resolved.slug === page.slug) continue;
      const key = [page.slug, resolved.slug].sort().join("--");
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        links.push({ source: page.slug, target: resolved.slug });
      }
    }
  }

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <div className="fixed inset-0 top-14 bg-base">
        {/* Legend */}
        <div className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur-sm border border-white/[0.08] rounded-lg px-4 py-3 flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">Brain</p>
          {Object.entries(BRAIN_COLORS).map(([brain, color]) => (
            <div key={brain} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="font-mono text-[10px] text-secondary capitalize">
                {brain.replace("-", " ")}
              </span>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <p className="font-mono text-[10px] text-muted text-center">
            Scroll to zoom · drag to pan · click a node to open the page
          </p>
        </div>

        <GraphView nodes={nodes} links={links} />
      </div>
    </>
  );
}
