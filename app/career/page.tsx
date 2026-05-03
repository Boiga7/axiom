import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { getSearchIndex } from '@/lib/wiki'
import {
  PROMOTION_TARGET,
  REQUIREMENT_AREAS,
  PREREQUISITES,
  BOARD_CRITERIA,
  CERTIFICATIONS,
  getDaysUntilBoard,
} from '@/lib/career-data'

export const metadata: Metadata = {
  title: 'Career — Senior Technical Consultant 2',
  description: 'Promotion readiness dashboard for Senior Technical Consultant Grade 2 at Resillion.',
}

const ACCENT_STYLES = {
  cyan:    { border: 'border-ae/20',          link: 'hover:text-ae',           dot: 'bg-ae/60',           label: 'text-ae/70' },
  violet:  { border: 'border-violet-500/20',  link: 'hover:text-violet-400',   dot: 'bg-violet-500/60',   label: 'text-violet-400/70' },
  rose:    { border: 'border-rose-500/20',    link: 'hover:text-rose-400',     dot: 'bg-rose-500/60',     label: 'text-rose-400/70' },
  amber:   { border: 'border-amber-400/20',   link: 'hover:text-amber-400',    dot: 'bg-amber-400/60',    label: 'text-amber-400/70' },
  emerald: { border: 'border-emerald-500/20', link: 'hover:text-emerald-400',  dot: 'bg-emerald-500/60',  label: 'text-emerald-400/70' },
  sky:     { border: 'border-sky-500/20',     link: 'hover:text-sky-400',      dot: 'bg-sky-500/60',      label: 'text-sky-400/70' },
}

export default function CareerPage() {
  const searchIndex = getSearchIndex()
  const daysUntil = getDaysUntilBoard()
  const totalPages = REQUIREMENT_AREAS.reduce((s, a) => s + a.pages.length, 0)

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
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">Pages Mapped</p>
              <p className="font-display text-3xl font-semibold text-ae">{totalPages}</p>
              <p className="font-mono text-[10px] text-muted mt-0.5">across {REQUIREMENT_AREAS.length} areas</p>
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
              {totalPages} pages mapped
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REQUIREMENT_AREAS.map((area) => {
              const styles = ACCENT_STYLES[area.accent]

              return (
                <div
                  key={area.id}
                  className={`rounded-lg border bg-card p-5 flex flex-col ${styles.border}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                    <p className={`font-mono text-[9px] uppercase tracking-widest ${styles.label}`}>
                      {area.pages.length} {area.pages.length === 1 ? 'page' : 'pages'}
                    </p>
                  </div>

                  <h3 className="font-display text-sm font-semibold text-primary leading-tight mb-2">
                    {area.label}
                  </h3>

                  <p className="font-mono text-[11px] text-secondary leading-relaxed mb-4 flex-1">
                    {area.description}
                  </p>

                  <div className="flex flex-col gap-1.5">
                    {area.pages.map((page) => (
                      <Link
                        key={`${page.category}/${page.slug}`}
                        href={`/${page.category}/${page.slug}`}
                        className={`font-mono text-[11px] text-secondary transition-colors truncate ${styles.link}`}
                      >
                        → {page.label}
                      </Link>
                    ))}
                  </div>

                </div>
              )
            })}
          </div>
        </section>

        {/* Board Checklist */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-5 rounded-full bg-ae/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-ae/80">
              Presentation Brief
            </h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
            <span className="font-mono text-[11px] text-muted">10–15 min · panel of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BOARD_CRITERIA.map((criterion, i) => (
              <div
                key={criterion.id}
                className="rounded-lg border border-white/[0.06] bg-card p-5 group hover:border-ae/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Slide {i + 1}</span>
                  <span className="font-display text-2xl font-semibold text-ae/20 group-hover:text-ae/40 transition-colors select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="font-display text-sm font-semibold text-primary mb-2 leading-snug">
                  {criterion.label}
                </p>
                <p className="font-mono text-[11px] text-secondary leading-relaxed">
                  {criterion.detail}
                </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PREREQUISITES.map((prereq, i) => (
              <div
                key={prereq.id}
                className="rounded-lg border border-white/[0.06] bg-card p-5 group hover:border-white/[0.12] transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded border border-white/[0.10] flex items-center justify-center shrink-0">
                    <span className="font-mono text-[8px] text-muted">{i + 1}</span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Required</span>
                </div>
                <p className="font-display text-sm font-semibold text-primary mb-1.5 leading-snug">
                  {prereq.label}
                </p>
                <p className="font-mono text-[11px] text-secondary leading-relaxed">
                  {prereq.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Certifications */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-5 rounded-full bg-amber-400/40" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-amber-400/70">
              Target Certifications
            </h2>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CERTIFICATIONS.map((cert) => (
              <div
                key={cert.id}
                className="rounded-lg border border-amber-400/20 bg-card p-5 group hover:border-amber-400/35 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                    AWS · {cert.level}
                  </span>
                  <span className="font-mono text-[9px] text-amber-400/60 uppercase tracking-widest">
                    {cert.code}
                  </span>
                </div>
                <p className="font-display text-sm font-semibold text-primary mb-2 leading-snug">
                  {cert.label}
                </p>
                <p className="font-mono text-[11px] text-secondary leading-relaxed mb-4">
                  {cert.detail}
                </p>
                <div className="flex items-center gap-2">
                  {cert.studySlug ? (
                    <Link
                      href={`/landscape/${cert.studySlug}`}
                      className="font-mono text-[9px] text-amber-400/60 hover:text-amber-400 uppercase tracking-widest transition-colors"
                    >
                      → Study Guide
                    </Link>
                  ) : (
                    <span className="font-mono text-[9px] text-amber-400/50 uppercase tracking-widest">Pending</span>
                  )}
                  <div className="h-0.5 flex-1 rounded-full bg-white/[0.06]" />
                  <span className="font-mono text-[9px] text-muted uppercase tracking-widest">In Progress</span>
                </div>
              </div>
            ))}
          </div>
        </section>

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
