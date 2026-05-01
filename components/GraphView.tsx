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
  source: string | Node;
  target: string | Node;
};

type Props = {
  nodes: Node[];
  links: Link[];
};

// Deterministic phase offset so each node pulses at its own rhythm
function nodePhase(id: string): number {
  return id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

// Hex two-digit alpha from 0–1 float
function alpha(opacity: number): string {
  return Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
}

export default function GraphView({ nodes, links }: Props) {
  const router = useRouter();
  const graphRef = useRef<any>(null);

  // Drive continuous redraws so pulsing keeps going after force simulation cools
  useEffect(() => {
    let animId: number;
    const tick = () => {
      graphRef.current?.refresh();
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleClick = useCallback(
    (node: object) => {
      router.push((node as Node).href);
    },
    [router]
  );

  const resolveNode = useCallback(
    (endpoint: string | Node): Node | undefined => {
      if (typeof endpoint === "object") return endpoint as Node;
      return nodes.find((n) => n.id === endpoint);
    },
    [nodes]
  );

  return (
    <div className="w-full h-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        backgroundColor="#07090d"
        nodeColor={(n) => (n as Node).color}
        nodeVal={(n) => (n as Node).val}
        nodeLabel={(n) => `${(n as Node).label} · ${(n as Node).category}`}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as Node & { x: number; y: number };
          if (!isFinite(n.x) || !isFinite(n.y)) return;

          const t = Date.now() / 1000;
          const phase = nodePhase(n.id);

          // Each node breathes at a slightly different rate (0.8–2.2 Hz)
          const freq = 0.8 + (phase % 11) * 0.13;
          const pulse = 1 + Math.sin(t * freq * Math.PI * 2 + phase * 0.41) * 0.13;

          // Occasional "firing" spike — a sharp bright flash at low frequency
          const fireFreq = 0.15 + (phase % 5) * 0.07;
          const fireRaw = Math.sin(t * fireFreq * Math.PI * 2 + phase * 1.7);
          const fire = Math.pow(Math.max(0, fireRaw), 8); // sharp spike, rare

          const baseR = Math.sqrt(n.val ?? 1) * 2.5;
          const r = baseR * pulse;

          // Outer ambient glow
          const glowA = 0.10 + fire * 0.35;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 3.2, 0, 2 * Math.PI);
          const grdOuter = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.2);
          grdOuter.addColorStop(0, n.color + alpha(glowA));
          grdOuter.addColorStop(1, "transparent");
          ctx.fillStyle = grdOuter;
          ctx.fill();

          // Inner halo — tighter, brighter on fire
          if (fire > 0.05) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 1.8, 0, 2 * Math.PI);
            const grdInner = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 1.8);
            grdInner.addColorStop(0, n.color + alpha(fire * 0.6));
            grdInner.addColorStop(1, "transparent");
            ctx.fillStyle = grdInner;
            ctx.fill();
          }

          // Node core
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
          // Brighten core during fire
          ctx.fillStyle = fire > 0.3 ? "#ffffff" + alpha(0.6 + fire * 0.4) : n.color;
          ctx.fill();

          // White hot centre on fire
          if (fire > 0.5) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 0.4, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffffff" + alpha(fire * 0.9);
            ctx.fill();
          }

          // Label at higher zoom
          if (globalScale > 1.8) {
            ctx.font = `${10 / globalScale}px "JetBrains Mono", monospace`;
            ctx.fillStyle = "#f0f4f8cc";
            ctx.textAlign = "center";
            ctx.fillText(n.label, n.x, n.y + r + 8 / globalScale);
          }
        }}
        linkColor={(link) => {
          const src = resolveNode((link as Link).source);
          return src ? src.color + "22" : "rgba(255,255,255,0.08)";
        }}
        linkWidth={0.6}
        // Particles travelling along each link — the "synaptic signal" effect
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.0025}
        linkDirectionalParticleWidth={1.8}
        linkDirectionalParticleColor={(link) => {
          const src = resolveNode((link as Link).source);
          return src ? src.color + "cc" : "#22d3ee";
        }}
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
