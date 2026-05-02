"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import Link from "next/link";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import java from "highlight.js/lib/languages/java";
import plaintext from "highlight.js/lib/languages/plaintext";

hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("jsx", javascript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("java", java);
hljs.registerLanguage("text", plaintext);

type Props = {
  content: string;
  allPageHrefs: Record<string, string>;
};

function resolveWikilinks(
  content: string,
  hrefs: Record<string, string>
): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const raw = inner.trim();
    const pipeIdx = raw.indexOf("|");
    const target = pipeIdx >= 0 ? raw.slice(0, pipeIdx).trim() : raw;
    const display = pipeIdx >= 0 ? raw.slice(pipeIdx + 1).trim() : raw;
    const basename = target.includes("/") ? target.split("/").pop()! : target;
    const href = hrefs[target] ?? hrefs[basename];
    if (href) return `[${display}](${href})`;
    return `*${display}*`;
  });
}

function stripTldrBlockquote(md: string): string {
  return md.replace(/^>[ \t]*\*{0,2}TL;?DR\*{0,2}:?[ \t][^\n]*\n?/gim, "");
}

// Strip leading # H1 — already rendered in the page header
function stripLeadingH1(md: string): string {
  return md.replace(/^# .+\n?/m, "");
}

function CopyButton({ preRef }: { preRef: React.RefObject<HTMLPreElement> }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const text = preRef.current?.innerText ?? "";
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-widest transition-all opacity-0 group-hover/code:opacity-100"
      style={{
        background: copied ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.06)",
        color: copied ? "#22d3ee" : "#4a5568",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      aria-label="Copy code"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  return (
    <div className="wiki-pre-scroll relative group/code">
      <pre ref={preRef}>{children}</pre>
      <CopyButton preRef={preRef} />
    </div>
  );
}

export default function WikiContent({ content, allPageHrefs }: Props) {
  const processed = resolveWikilinks(
    stripLeadingH1(stripTldrBlockquote(content)),
    allPageHrefs
  );

  const components: Components = {
    a: ({ href, children }) => {
      if (!href) return <>{children}</>;
      const isInternal = href.startsWith("/");
      if (isInternal) {
        return <Link href={href} className="wikilink">{children}</Link>;
      }
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
    // Suppress — already rendered as the page header
    h1: () => null,
    h2: ({ children }) => {
      const text = Array.isArray(children)
        ? children.map((c) => (typeof c === "string" ? c : "")).join("")
        : typeof children === "string" ? children : "";
      const id = text
        .toLowerCase()
        .replace(/[*_`[\]()#]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      return <h2 id={id}>{children}</h2>;
    },
    h3: ({ children }) => {
      const text = Array.isArray(children)
        ? children.map((c) => (typeof c === "string" ? c : "")).join("")
        : typeof children === "string" ? children : "";
      const id = text
        .toLowerCase()
        .replace(/[*_`[\]()#]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      return <h3 id={id}>{children}</h3>;
    },
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    code: ({ className, children }) => {
      const language = className?.replace("language-", "") ?? "";
      const code = typeof children === "string" ? children.replace(/\n$/, "") : "";

      if (language && code && hljs.getLanguage(language)) {
        const highlighted = hljs.highlight(code, { language }).value;
        return (
          <code
            className={`hljs language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        );
      }

      // Inline or unknown language
      if (!className) {
        return <code>{children}</code>;
      }
      return <code className={className}>{children}</code>;
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
