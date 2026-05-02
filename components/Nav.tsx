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
        <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label="The Axiom">
          <span className="text-ae font-mono text-sm opacity-60 group-hover:opacity-100 transition-opacity">⬡</span>
        </Link>

        {/* Search */}
        <div className="flex-1 min-w-0">
          <Search index={searchIndex} />
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 shrink-0">
          {NAV.map(({ href, label, icon }) => {
            const segment = href === "/" ? "/" : `/${href.split("/")[1]}`;
            const active = segment === "/" ? pathname === "/" : pathname.startsWith(segment);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-sm sm:text-xs font-mono transition-colors ${
                  active
                    ? "text-ae bg-ae/10"
                    : "text-secondary hover:text-primary hover:bg-white/[0.04]"
                }`}
              >
                <span className={active ? "" : "opacity-60"}>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
