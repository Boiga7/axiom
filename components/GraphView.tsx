"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { BRAIN_COLORS, BRAIN_MAP, type Brain } from "@/lib/constants";

// react-force-graph-2d uses browser APIs — must be dynamic
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted font-mono text-xs">
      Loading graph…
    </div>
  ),
});

type Node = {
  id: string;
  label: string;
  category: string;
  href: string;
  color: string;
  val: number;
};

type Link = {
  source: string;
  target: string;
};

type Props = {
  nodes: Node[];
  links: Link[];
};

export default function GraphView({ nodes, links }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{ width: number; height: number } | null>(null);

  const handleClick = useCallback(
    (node: Node) => {
      router.push(node.href);
    },
    [router]
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        graphData={{ nodes, links }}
        backgroundColor="#07090d"
        nodeColor={(n) => (n as Node).color}
        nodeVal={(n) => (n as Node).val}
        nodeLabel={(n) => `${(n as Node).label} · ${(n as Node).category}`}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as Node & { x: number; y: number };
          if (!isFinite(n.x) || !isFinite(n.y)) return;
          const r = Math.sqrt((n.val ?? 1)) * 2.5;
          // Glow
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 2, 0, 2 * Math.PI);
          const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2);
          grd.addColorStop(0, n.color + "40");
          grd.addColorStop(1, "transparent");
          ctx.fillStyle = grd;
          ctx.fill();
          // Node dot
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = n.color;
          ctx.fill();
          // Label at higher zoom
          if (globalScale > 1.8) {
            const label = n.label;
            ctx.font = `${10 / globalScale}px "JetBrains Mono", monospace`;
            ctx.fillStyle = "#f0f4f8cc";
            ctx.textAlign = "center";
            ctx.fillText(label, n.x, n.y + r + 8 / globalScale);
          }
        }}
        linkColor={() => "rgba(255,255,255,0.06)"}
        linkWidth={0.5}
        onNodeClick={handleClick}
        warmupTicks={80}
        cooldownTicks={200}
        enableZoomInteraction
        enablePanInteraction
        minZoom={0.3}
        maxZoom={6}
      />
    </div>
  );
}