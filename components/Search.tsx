"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import type { SearchEntry } from "@/lib/constants";
import { slugToLabel } from "@/lib/constants";

type Props = { index: SearchEntry[] };

export default function Search({ index }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fuse = useRef(
    new Fuse(index, {
      keys: [
        { name: "title", weight: 0.6 },
        { name: "tags", weight: 0.25 },
        { name: "excerpt", weight: 0.15 },
      ],
      threshold: 0.35,
      minMatchCharLength: 2,
    })
  );

  const search = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const hits = fuse.current.search(q).slice(0, 8);
      setResults(hits.map((h) => h.item));
      setActive(0);
    },
    []
  );

  useEffect(() => {
    search(query);
  }, [query, search]);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigate = (href: string) => {
    router.push(href);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigate(results[active].href);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <svg
          className="absolute left-3 w-3.5 h-3.5 text-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
          placeholder="Search the Axiom…"
          className="w-full h-9 sm:h-8 pl-8 pr-3 sm:pr-14 rounded-md bg-card border border-white/[0.07] text-primary placeholder-muted text-xs font-mono focus:outline-none focus:border-ae/40 focus:bg-elevated transition-colors"
        />
        <span className="absolute right-2.5 text-[10px] font-mono text-muted bg-elevated border border-white/[0.07] rounded px-1.5 py-0.5 pointer-events-none hidden sm:block">
          ⌘K
        </span>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-elevated border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden z-50"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        >
          {results.map((r, i) => (
            <button
              key={r.href}
              onMouseDown={() => navigate(r.href)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors ${
                i === active ? "bg-ae/10" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted shrink-0 w-16 truncate">
                {slugToLabel(r.category)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-primary font-medium truncate">{r.title}</div>
                {r.excerpt && (
                  <div className="text-[11px] text-secondary truncate mt-0.5">{r.excerpt}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
