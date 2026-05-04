// components/LearningPathCard.tsx
import Link from "next/link";
import { BRAIN_COLORS, getBrainVar } from "@/lib/constants";
import type { LearningPath } from "@/lib/learning-paths";
import type { Brain } from "@/lib/constants";

export default function LearningPathCard({ path }: { path: LearningPath }) {
  const color = BRAIN_COLORS[path.brain as Brain] ?? "#94a3b8";
  const colorVar = getBrainVar((path.brain as Brain) ?? "other");

  return (
    <Link
      href={`/learn/${path.id}`}
      className="group relative block rounded-xl border border-white/[0.06] bg-card p-6 transition-all duration-200 hover:border-white/[0.14] hover:bg-elevated overflow-hidden"
    >
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 0% 0%, ${color}14 0%, transparent 70%)`,
        }}
      />

      <div className="relative">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: colorVar }} />
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: colorVar }}>
            {path.steps.length} topics · ~{path.estimatedHours}h
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-display text-lg font-semibold text-primary leading-tight mb-2 group-hover:text-white transition-colors"
          style={{ letterSpacing: "-0.02em" }}
        >
          {path.title}
        </h3>

        {/* Description */}
        <p className="text-secondary text-sm leading-relaxed line-clamp-3">
          {path.description}
        </p>

        {/* CTA */}
        <div className="flex items-center gap-1.5 mt-4">
          <span className="font-mono text-[10px]" style={{ color: colorVar }}>
            Start →
          </span>
        </div>
      </div>
    </Link>
  );
}
