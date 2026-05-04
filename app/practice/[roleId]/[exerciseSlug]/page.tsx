import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { getSearchIndex } from "@/lib/wiki";
import { ROLE_PATHS, getRolePath, getExercise } from "@/lib/practice-data";
import hljs from "highlight.js";

type Props = {
  params: Promise<{ roleId: string; exerciseSlug: string }>;
};

export async function generateStaticParams() {
  return ROLE_PATHS.flatMap((path) =>
    path.exercises.map((ex) => ({
      roleId: path.id,
      exerciseSlug: ex.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roleId, exerciseSlug } = await params;
  const ex = getExercise(roleId, exerciseSlug);
  if (!ex) return {};
  return {
    title: ex.title,
    description: ex.tagline,
  };
}

const DIFFICULTY_STYLES = {
  Beginner: "text-emerald-400/80 border-emerald-400/20 bg-emerald-400/5",
  Intermediate: "text-amber-400/80 border-amber-400/20 bg-amber-400/5",
  Advanced: "text-rose-400/80 border-rose-400/20 bg-rose-400/5",
} as const;

export default async function ExercisePage({ params }: Props) {
  const { roleId, exerciseSlug } = await params;
  const path = getRolePath(roleId);
  const ex = getExercise(roleId, exerciseSlug);

  if (!path || !ex) notFound();

  const searchIndex = getSearchIndex();

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pb-24">
        {/* Breadcrumb */}
        <nav className="pt-10 pb-8 flex items-center gap-2 font-mono text-[11px] text-muted">
          <Link href="/practice" className="hover:text-secondary transition-colors">
            Practice Lab
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-secondary">{path.title}</span>
          <span className="text-white/20">/</span>
          <span className="text-ae/60 truncate">{ex.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded border ${DIFFICULTY_STYLES[ex.difficulty]}`}>
              {ex.difficulty}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {path.title}
            </span>
          </div>
          <h1
            className="font-display text-3xl sm:text-4xl font-semibold text-primary mb-4 leading-[1.1]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {ex.title}
          </h1>
          <p className="text-secondary text-lg leading-relaxed">
            {ex.description}
          </p>
        </header>

        {/* Why it matters */}
        <section className="mb-12 rounded-lg border border-ae/20 bg-ae/5 p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-ae/80 mb-3">
            Why this matters
          </h2>
          <p className="text-secondary leading-relaxed">
            {ex.whyItMatters}
          </p>
        </section>

        {/* Prerequisites */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-primary mb-4">
            Before you start
          </h2>
          <ul className="space-y-2">
            {ex.prerequisites.map((prereq, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-ae/40 shrink-0" />
                <span className="text-secondary text-sm leading-relaxed">{prereq}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Steps */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-primary mb-6">
            Step-by-step guide
          </h2>
          <ol className="space-y-8">
            {ex.steps.map((step, i) => (
              <li key={i} className="flex gap-5">
                <div className="shrink-0 w-7 h-7 rounded-full border border-white/[0.1] bg-elevated flex items-center justify-center font-mono text-[11px] text-muted mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-semibold text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-secondary text-sm leading-relaxed">
                    {step.body}
                  </p>
                  {step.code && (() => {
                    const highlighted = hljs.highlight(step.code.snippet, {
                      language: step.code.lang,
                      ignoreIllegals: true,
                    });
                    return (
                      <div className="wiki-pre-scroll mt-3">
                        <pre className="wiki-prose">
                          <code
                            className={`hljs language-${step.code.lang}`}
                            dangerouslySetInnerHTML={{ __html: highlighted.value }}
                          />
                        </pre>
                      </div>
                    );
                  })()}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Axiom pages */}
        {ex.axiomPages.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-xl font-semibold text-primary mb-4">
              Relevant Axiom pages
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ex.axiomPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="group flex items-center justify-between rounded-lg border border-white/[0.06] bg-card px-4 py-3 transition-all hover:border-white/[0.12] hover:bg-elevated"
                >
                  <span className="text-secondary text-sm group-hover:text-primary transition-colors">
                    {page.title}
                  </span>
                  <svg className="text-muted group-hover:text-ae transition-colors shrink-0 ml-2" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* What next */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-primary mb-4">
            What to do next
          </h2>
          <ul className="space-y-3">
            {ex.whatNext.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 text-secondary text-sm hover:text-primary transition-colors"
                >
                  <svg className="text-ae/40 group-hover:text-ae transition-colors shrink-0" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Back link */}
        <div className="pt-4 border-t border-white/[0.06]">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted hover:text-secondary transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M9.5 6h-7M5.5 3L2.5 6l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Practice Lab
          </Link>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mt-16 mb-10" />
        <footer className="flex items-center justify-center gap-4 text-muted font-mono text-[11px] tracking-wider pb-2">
          <a href="/" className="hover:text-secondary transition-colors">Home</a>
          <span className="text-white/10">·</span>
          <a href="/graph" className="hover:text-secondary transition-colors">Graph</a>
          <span className="text-white/10">·</span>
          <a href="/scan" className="hover:text-secondary transition-colors">Scan</a>
          <span className="text-white/10">·</span>
          <span className="text-ae/40">elliot-digital.co.uk</span>
        </footer>
      </main>
    </>
  );
}
