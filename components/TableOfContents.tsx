"use client";

type Heading = { id: string; text: string; level: 2 | 3 };

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`[\]()#]/g, "") // strip markdown formatting
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractHeadings(markdown: string): Heading[] {
  // Strip fenced code blocks first to avoid picking up # inside them
  const stripped = markdown.replace(/```[\s\S]*?```/g, "");
  const lines = stripped.split("\n");
  const headings: Heading[] = [];

  for (const line of lines) {
    const m2 = line.match(/^##\s+(.+)$/);
    const m3 = line.match(/^###\s+(.+)$/);
    if (m2) {
      const text = m2[1].replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1").trim();
      headings.push({ id: slugifyHeading(text), text, level: 2 });
    } else if (m3) {
      const text = m3[1].replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1").trim();
      headings.push({ id: slugifyHeading(text), text, level: 3 });
    }
  }

  return headings;
}

type Props = {
  content: string;
  color?: string;
};

export default function TableOfContents({ content, color = "#94a3b8" }: Props) {
  const headings = extractHeadings(content);

  // Only render if there are enough headings to be useful
  if (headings.filter((h) => h.level === 2).length < 2) return null;

  return (
    <nav aria-label="Table of contents">
      <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color }}>
        Contents
      </p>
      <ul className="flex flex-col gap-0.5">
        {headings.map((h) => (
          <li key={`${h.id}-${h.level}`}>
            <a
              href={`#${h.id}`}
              className="block text-xs text-secondary hover:text-primary px-2.5 py-1 rounded-md hover:bg-card transition-colors leading-snug"
              style={{ paddingLeft: h.level === 3 ? "1.5rem" : "0.625rem" }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
