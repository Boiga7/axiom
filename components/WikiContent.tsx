"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import Link from "next/link";

type Props = {
  content: string;
  allPageHrefs: Record<string, string>; // basename -> href
};

// Resolve [[wikilink]] syntax to Next.js hrefs
function resolveWikilinks(
  content: string,
  hrefs: Record<string, string>
): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const raw = inner.trim();
    // Display text after pipe: [[page|Display]]
    const pipeIdx = raw.indexOf("|");
    const target = pipeIdx >= 0 ? raw.slice(0, pipeIdx).trim() : raw;
    const display = pipeIdx >= 0 ? raw.slice(pipeIdx + 1).trim() : raw;

    // Try full path match first, then basename
    const basename = target.includes("/")
      ? target.split("/").pop()!
      : target;
    const href = hrefs[target] ?? hrefs[basename];

    if (href) {
      return `[${display}](${href})`;
    }
    // Unresolved — render as italic text
    return `*${display}*`;
  });
}

// Strip > TL;DR blockquote lines from the raw markdown
function stripTldrBlockquote(md: string): string {
  return md.replace(/^>[ \t]*\*{0,2}TL;?DR\*{0,2}:?[ \t][^\n]*\n?/gim, "");
}

export default function WikiContent({ content, allPageHrefs }: Props) {
  const processed = resolveWikilinks(stripTldrBlockquote(content), allPageHrefs);

  const components: Components = {
    a: ({ href, children }) => {
      if (!href) return <>{children}</>;
      const isInternal = href.startsWith("/");
      if (isInternal) {
        return (
          <Link href={href} className="wikilink">
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    // Strip the first H1 since we render it in the page header
    h1: ({ children }) => (
      <h1>{children}</h1>
    ),
    pre: ({ children }) => (
      <div className="wiki-pre-scroll">
        <pre>{children}</pre>
      </div>
    ),
    code: ({ className, children, ...props }) => {
      const inline = !className;
      if (inline) {
        return <code {...props}>{children}</code>;
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    table: ({ children }) => (
      <div className="wiki-table-scroll">
        <table>{children}</table>
      </div>
    ),
    img: ({ src, alt }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} className="wiki-img" />
    ),
  };

  return (
    <div className="wiki-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}
