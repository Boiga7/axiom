"use client";

import { useState, useCallback } from "react";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

type Exercise = {
  title: string;
  description: string;
  difficulty: Difficulty;
};

type RolePath = {
  id: string;
  title: string;
  description: string;
  exercises: Exercise[];
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Beginner: "text-emerald-400/80 border-emerald-400/20 bg-emerald-400/5",
  Intermediate: "text-amber-400/80 border-amber-400/20 bg-amber-400/5",
  Advanced: "text-rose-400/80 border-rose-400/20 bg-rose-400/5",
};

const FILTER_DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"] as const;

function buildPrompt(ex: Exercise, pathTitle: string): string {
  return `I'm working through this ${pathTitle} exercise:\n\n**${ex.title}**\n\n${ex.description}\n\nPlease help me work through this step by step, explaining the key concepts as we go.`;
}

function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(prompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  return (
    <button
      onClick={handleCopy}
      className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-all"
      style={{
        color: copied ? "#22d3ee" : "rgba(148,163,184,0.5)",
      }}
      aria-label="Copy exercise prompt"
      title="Copy a ready-made prompt for this exercise"
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="1" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="1" y="3" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="#0d1117"/>
          </svg>
          Copy prompt
        </>
      )}
    </button>
  );
}

export default function PracticeClient({ paths }: { paths: RolePath[] }) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");

  const q = search.toLowerCase().trim();
  const hasFilter = q.length > 0 || difficulty !== "All";

  const filtered = paths.map((path) => ({
    ...path,
    exercises: path.exercises.filter((ex) => {
      const matchesDifficulty = difficulty === "All" || ex.difficulty === difficulty;
      const matchesSearch =
        q === "" ||
        ex.title.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q) ||
        path.title.toLowerCase().includes(q);
      return matchesDifficulty && matchesSearch;
    }),
  })).filter((path) => path.exercises.length > 0);

  const totalMatches = filtered.reduce((n, p) => n + p.exercises.length, 0);

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="13" height="13" viewBox="0 0 16 16" fill="none"
          >
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-white/[0.07] bg-card font-mono text-[12px] text-secondary placeholder:text-muted focus:outline-none focus:border-ae/30 focus:bg-elevated transition-all"
          />
        </div>

        {/* Difficulty pills */}
        <div className="flex items-center gap-1.5">
          {FILTER_DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase tracking-widest transition-all ${
                difficulty === d
                  ? "border-ae/40 bg-ae/10 text-ae"
                  : "border-white/[0.07] bg-card text-muted hover:border-white/[0.14] hover:text-secondary"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Match count */}
        {hasFilter && (
          <span className="self-center font-mono text-[11px] text-muted">
            {totalMatches} {totalMatches === 1 ? "exercise" : "exercises"}
          </span>
        )}
      </div>

      {/* No results */}
      {hasFilter && filtered.length === 0 && (
        <div className="text-center py-16 text-muted font-mono text-sm">
          No exercises match &ldquo;{search}&rdquo;
          {difficulty !== "All" && ` · ${difficulty}`}
        </div>
      )}

      {/* Role path sections */}
      <div className="space-y-16">
        {(hasFilter ? filtered : paths).map((path) => (
          <section key={path.id}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-5 rounded-full bg-ae/60" />
              <h2 className="font-display text-2xl font-semibold text-primary">
                {path.title}
              </h2>
            </div>
            <p className="text-secondary text-sm mb-6 ml-4">{path.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
              {path.exercises.map((ex, i) => {
                const prompt = buildPrompt(ex, path.title);
                return (
                  <div
                    key={i}
                    className="group relative rounded-lg border border-white/[0.06] bg-card p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-elevated flex flex-col"
                  >
                    <div
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.06) 0%, transparent 70%)" }}
                    />
                    <div className="relative flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                          Exercise {i + 1}
                        </span>
                        <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border ${DIFFICULTY_STYLES[ex.difficulty]}`}>
                          {ex.difficulty}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-semibold text-primary leading-snug mb-2 group-hover:text-white transition-colors">
                        {ex.title}
                      </h3>
                      <p className="font-mono text-[11px] text-muted leading-relaxed flex-1">
                        {ex.description}
                      </p>
                      <CopyPromptButton prompt={prompt} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
