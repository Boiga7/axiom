"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { slugToLabel } from "@/lib/constants";

type Step = {
  href: string;
  title: string;
  excerpt?: string;
  note?: string;
  category: string;
  index: number;
};

type Props = {
  steps: Step[];
  pathId: string;
  color: string;
  colorVar?: string;
  estimatedHours: number;
};

export default function PathSteps({ steps, pathId, color, colorVar, estimatedHours }: Props) {
  const cv = colorVar ?? color;
  const storageKey = `axiom-path-${pathId}`;
  const [done, setDone] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Read from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as number[];
      setDone(new Set(saved));
    } catch {
      // ignore
    }
    setMounted(true);
  }, [storageKey]);

  const toggle = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const completedCount = done.size;
  const totalCount = steps.length;
  const allDone = completedCount === totalCount && totalCount > 0;

  return (
    <>
      {/* Progress bar */}
      {mounted && completedCount > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
                background: allDone ? "#34d399" : color,
              }}
            />
          </div>
          <span className="font-mono text-[10px] shrink-0 text-muted">
            {allDone ? "Complete" : `${completedCount}/${totalCount}`}
          </span>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {steps.map((step) => {
          const isDone = mounted && done.has(step.index);
          return (
            <li key={`${step.category}/${step.href}`}>
              <Link
                href={step.href}
                className="group flex gap-5 rounded-xl border bg-card px-6 py-5 transition-all duration-150 hover:bg-elevated"
                style={{
                  borderColor: isDone ? color + "30" : "rgba(255,255,255,0.06)",
                }}
              >
                {/* Step number / check */}
                <button
                  onClick={(e) => toggle(step.index, e)}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-semibold mt-0.5 transition-all"
                  style={{
                    background: isDone ? color + "25" : color + "18",
                    color: isDone ? color : color,
                    border: `1px solid ${isDone ? color + "60" : color + "30"}`,
                  }}
                  aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                >
                  {isDone ? "✓" : step.index + 1}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="font-mono text-[9px] uppercase tracking-widest mb-1"
                        style={{ color: cv }}
                      >
                        {slugToLabel(step.category)}
                      </p>
                      <h2
                        className={`font-display text-base font-semibold leading-snug transition-colors ${isDone ? "" : "text-primary"}`}
                        style={isDone ? { color: cv } : undefined}
                      >
                        {step.title}
                      </h2>
                    </div>
                    <svg
                      className="w-4 h-4 text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>

                  {step.excerpt && (
                    <p className="text-secondary text-sm leading-relaxed mt-1.5 line-clamp-2">
                      {step.excerpt}
                    </p>
                  )}

                  {step.note && (
                    <p
                      className="font-mono text-[10px] mt-2"
                      style={{ color: cv }}
                    >
                      ↳ {step.note}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
        <p className="text-muted font-mono text-xs">
          {totalCount} pages · ~{estimatedHours}h estimated reading time
        </p>
        <Link
          href="/"
          className="inline-block mt-3 text-xs font-mono text-muted hover:text-secondary transition-colors"
        >
          ← Browse all topics
        </Link>
      </div>
    </>
  );
}
