"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Search from "./Search";
import type { SearchEntry } from "@/lib/constants";

type NavProps = {
  searchIndex: SearchEntry[];
};

const NAV = [
  { href: "/", label: "Home", icon: "⊹" },
  { href: "/graph", label: "Graph", icon: "◎" },
  { href: "/scan", label: "Scan", icon: "⟳" },
];

export default function Nav({ searchIndex }: NavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-base/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="text-ae font-mono text-xs opacity-60 group-hover:opacity-100 transition-opacity">⬡</span>
          <span className="font-display text-base font-semibold text-primary" style={{ letterSpacing: "-0.02em" }}>
            The Axiom
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-lg">
          <Search index={searchIndex} />
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  active
                    ? "text-ae bg-ae/10"
                    : "text-secondary hover:text-primary hover:bg-white/[0.04]"
                }`}
              >
                <span className="opacity-60">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
