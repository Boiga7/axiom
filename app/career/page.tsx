import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { getSearchIndex } from '@/lib/wiki'
import {
  PROMOTION_TARGET,
  REQUIREMENT_AREAS,
  PREREQUISITES,
  BOARD_CRITERIA,
  getCoverageLevel,
  getDaysUntilBoard,
} from '@/lib/career-data'

export const metadata: Metadata = {
  title: 'Career — Senior Technical Consultant 2',
  description: 'Promotion readiness dashboard for Senior Technical Consultant Grade 2 at Resillion.',
}

const COVERAGE_STYLES = {
  high: {
    bar: 'bg-ae',
    label: 'text-ae',
    border: 'border-ae/20',
    text: 'High',
  },
  medium: {
    bar: 'bg-amber-400',
    label: 'text-amber-400',
    border: 'border-amber-400/20',
    text: 'Medium',
  },
  low: {
    bar: 'bg-rose-500',
    label: 'text-rose-400',
    border: 'border-rose-500/20',
    text: 'Low',
  },
}

export default function CareerPage() {
  const searchIndex = getSearchIndex()
  const daysUntil = getDaysUntilBoard()
  const lowCoverageAreas = REQUIREMENT_AREAS.filter(
    (area) => getCoverageLevel(area.pages.length) === 'low'
  )
  const highCount = REQUIREMENT_AREAS.filter((a) => getCoverageLevel(a.pages.length) === 'high').length

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">

        {/* Hero */}
        <section className="pt-16 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-ae animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ae/80">
              Career Readiness · {PROMOTION_TARGET.company}
            </span>
          </div>

          <h1
            className="font-display text-4xl sm:text-5xl font-semibold text-primary mb-4 leading-[1.05]"
            style={{ letterSpacing: '-0.03em' }}
          >
            {PROMOTION_TARGET.role}
            <span className="text-ae"> · Grade {PROMOTION_TARGET.grade}</span>
          </h1>

          <p className="text-secondary text-lg leading-relaxed max-w-2xl mb-10">
            Promotion board targeting January/February 2027. Evidence must be less than one year old.
            Presentation: 10–15 minutes to a panel of up to 3 senior leaders.
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-white/[0.08] bg-card px-5 py-4 min-w-[140px]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">Days Until Board</p>
              <p className="font-display text-3xl font-semibold text-ae">{daysUntil}</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-card px-5 py-4 min-w-[140px]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">Effective</p>
              <p className="font-display text-3xl font-semibold text-primary">1 Apr 2027</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-card px-5 py-4 min-w-[140px]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">Areas Covered</p>
              <p className="font-display text-3xl font-semibold text-primary">
                {highCount}
                <span className="text-muted text-lg font-normal"> / {REQUIREMENT_AREAS.length}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Coverage Grid */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-5 rounded-full bg-ae/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-ae/80">
              Vault Coverage by Requirement
            </h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
            <span className="font-mono text-[11px] text-muted">
              {REQUIREMENT_AREAS.reduce((s, a) => s + a.pages.length, 0)} pages mapped
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REQUIREMENT_AREAS.map((area) => {
              const level = getCoverageLevel(area.pages.length)
              const styles = COVERAGE_STYLES[level]
              const barWidth = Math.min(100, (area.pages.length / 5) * 100)

              return (
                <div
                  key={area.id}
                  className={`rounded-lg border bg-card p-5 flex flex-col ${styles.border}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                      {area.pages.length} {area.pages.length === 1 ? 'page' : 'pages'}
                    </p>
                    <span className={`font-mono text-[9px] uppercase tracking-widest ${styles.label}`}>
                      {styles.text}
                    </span>
                  </div>

                  <h3 className="font-display text-sm font-semibold text-primary leading-tight mb-2">
                    {area.label}
                  </h3>

                  <p className="font-mono text-[11px] text-muted leading-relaxed mb-4 flex-1">
                    {area.description}
                  </p>

                  <div className="flex flex-col gap-1.5 mb-4">
                    {area.pages.map((page) => (
                      <Link
                        key={`${page.category}/${page.slug}`}
                        href={`/${page.category}/${page.slug}`}
                        className="font-mono text-[11px] text-secondary hover:text-ae transition-colors truncate"
                      >
                        → {page.label}
                      </Link>
                    ))}
                  </div>

                  <div className="h-0.5 rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${styles.bar}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Board Checklist */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-5 rounded-full bg-white/20" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-secondary">
              Promotion Board Criteria
            </h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>
          <p className="font-mono text-[11px] text-muted mb-6 ml-4">
            10–15 min presentation. Prepare specific evidence for each of these.
          </p>

          <div className="flex flex-col gap-3">
            {BOARD_CRITERIA.map((criterion, i) => (
              <div
                key={criterion.id}
                className="flex gap-4 rounded-lg border border-white/[0.06] bg-card px-5 py-4"
              >
                <div className="mt-0.5 w-5 h-5 shrink-0 rounded border border-white/[0.12] flex items-center justify-center">
                  <span className="font-mono text-[9px] text-muted">{i + 1}</span>
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-primary mb-1">
                    {criterion.label}
                  </p>
                  <p className="font-mono text-[11px] text-muted leading-relaxed">
                    {criterion.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Prerequisites */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-5 rounded-full bg-white/10" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Prerequisites — Grade 2
            </h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PREREQUISITES.map((prereq) => (
              <div
                key={prereq.id}
                className="rounded-lg border border-white/[0.06] bg-card px-5 py-4"
              >
                <p className="font-display text-sm font-semibold text-primary mb-1">
                  {prereq.label}
                </p>
                <p className="font-mono text-[11px] text-muted leading-relaxed">
                  {prereq.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Research Gaps */}
        {lowCoverageAreas.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-5 rounded-full bg-rose-500/60" />
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-rose-400/80">
                Research Gaps
              </h2>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
            <p className="font-mono text-[11px] text-muted mb-6 ml-4">
              Requirement areas with low vault coverage — prioritise research here to strengthen your case.
            </p>

            <div className="flex flex-col gap-3">
              {lowCoverageAreas.map((area) => (
                <div
                  key={area.id}
                  className="rounded-lg border border-rose-500/20 bg-card px-5 py-4"
                >
                  <p className="font-display text-sm font-semibold text-primary mb-1">{area.label}</p>
                  <p className="font-mono text-[11px] text-muted leading-relaxed">{area.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mt-8 mb-10" />
        <footer className="flex items-center justify-center gap-4 text-muted font-mono text-[11px] tracking-wider pb-2">
          <Link href="/" className="hover:text-secondary transition-colors">Home</Link>
          <span className="text-white/10">·</span>
          <Link href="/graph" className="hover:text-secondary transition-colors">Graph</Link>
          <span className="text-white/10">·</span>
          <Link href="/scan" className="hover:text-secondary transition-colors">Scan</Link>
          <span className="text-white/10">·</span>
          <span className="text-ae/40">elliot-digital.co.uk</span>
        </footer>
      </main>
    </>
  )
}
