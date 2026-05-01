"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Search from "./Search";
import type { SearchEntry } from "@/lib/constants";

type NavProps = {
  searchIndex: SearchEntry[];
};

export default function Nav({ searchIndex }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-base/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <span className="text-ae font-mono text-xs tracking-widest uppercase opacity-60 group-hover:opacity-100 transition-opacity">
            ⬡
          </span>
          <span
            className="font-display text-base font-semibold text-primary tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            The Axiom
          </span>
        </Link>

        {/* Search — fills remaining space */}
        <div className="flex-1 max-w-lg">
          <Search index={searchIndex} />
        </div>

      </div>
    </header>
  );
}
