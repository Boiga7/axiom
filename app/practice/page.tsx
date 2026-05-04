import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PracticeClient from "@/components/PracticeClient";
import { getSearchIndex } from "@/lib/wiki";
import { ROLE_PATHS } from "@/lib/practice-data";

export const metadata: Metadata = {
  title: "Practice Lab",
  description: "Hands-on exercises for each engineering role path. Build real skills, not just reading comprehension.",
};

export default function PracticePage() {
  const searchIndex = getSearchIndex();

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-ae animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ae/80">
              Practice Lab
            </span>
          </div>
          <h1
            className="font-display text-4xl sm:text-5xl font-semibold text-primary mb-4 leading-[1.05]"
            style={{ letterSpacing: "-0.03em" }}
          >
            Build real skills.
          </h1>
          <p className="text-secondary text-lg leading-relaxed max-w-2xl">
            Hands-on exercises per role path. Each one is a concrete task you can complete
            in a sitting: not reading, not watching, building.
          </p>
        </section>

        {/* Interactive content */}
        <PracticeClient paths={ROLE_PATHS} />

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
