"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

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

// Evenly distribute n points on a unit sphere (Fibonacci spiral)
function fibonacciSphere(n: number): [number, number, number][] {
  const phi = (1 + Math.sqrt(5)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = Math.acos(1 - 2 * (i + 0.5) / n);
    const az = 2 * Math.PI * i / phi;
    return [
      Math.sin(t) * Math.cos(az),
      Math.cos(t),
      Math.sin(t) * Math.sin(az),
    ];
  });
}

function rotY([x, y, z]: [number, number, number], a: number): [number, number, number] {
  return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
}

function rotX([x, y, z]: [number, number, number], a: number): [number, number, number] {
  return [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
}

function hex2(v: number) {
  return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
}

export default function GraphView({ nodes, links }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mutable state kept in a ref so the animation loop always sees fresh values
  const state = useRef({
    rotY: 0,
    rotX: -0.25,
    dragging: false,
    lastX: 0,
    lastY: 0,
    hoverId: null as string | null,
  });

  // Pre-computed sphere positions (one per node)
  const positions = useRef<[number, number, number][]>([]);

  // Adjacency index: nodeId → set of connected nodeIds
  const adj = useRef<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    positions.current = fibonacciSphere(nodes.length);

    const map = new Map<string, Set<string>>();
    for (const n of nodes) map.set(n.id, new Set());
    for (const l of links) {
      const a = l.source as string;
      const b = l.target as string;
      map.get(a)?.add(b);
      map.get(b)?.add(a);
    }
    adj.current = map;
  }, [nodes, links]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) { animId = requestAnimationFrame(draw); return; }

      const W = canvas.width;
      const H = canvas.height;
      const cssW = W / dpr;
      const cssH = H / dpr;
      const cx = W / 2;
      const cy = H / 2;
      // Sphere fills ~70% of the smaller dimension
      const R = Math.min(W, H) * 0.36;
      const t = Date.now() / 1000;

      ctx.clearRect(0, 0, W, H);

      // Auto-rotate
      if (!state.current.dragging) {
        state.current.rotY += 0.0018;
      }

      const s = state.current;

      // --- Project all nodes ---
      const proj = nodes.map((node, i) => {
        const pos = positions.current[i] ?? [0, 0, 0];
        let p = rotX(pos as [number, number, number], s.rotX);
        p = rotY(p, s.rotY);
        const [x, y, z] = p;
        // Slight perspective: nodes at front (z=1) are 15% larger
        const scale = 1 + z * 0.15;
        return {
          px: cx + x * R * scale,
          py: cy + y * R * scale,
          z,
          node,
          i,
        };
      });

      // --- Atmospheric shell ---
      const atmR = R * 1.08;
      const atm = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, atmR);
      atm.addColorStop(0, "rgba(34,211,238,0.05)");
      atm.addColorStop(0.5, "rgba(34,211,238,0.02)");
      atm.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, atmR, 0, Math.PI * 2);
      ctx.fillStyle = atm;
      ctx.fill();

      // --- Links (draw behind sphere centre for depth) ---
      const hov = s.hoverId;
      const hovAdj = hov ? adj.current.get(hov) : null;

      for (const l of links) {
        const ai = nodes.findIndex((n) => n.id === l.source);
        const bi = nodes.findIndex((n) => n.id === l.target);
        if (ai < 0 || bi < 0) continue;
        const a = proj[ai];
        const b = proj[bi];
        // Skip if both nodes are fully behind the sphere
        if (a.z < -0.5 && b.z < -0.5) continue;

        const avgZ = (a.z + b.z) / 2;
        const depthA = Math.max(0, avgZ + 0.5) / 1.5;

        const isHighlit = hov &&
          (a.node.id === hov || b.node.id === hov || hovAdj?.has(a.node.id) && hovAdj?.has(b.node.id));

        const opacity = isHighlit ? depthA * 0.6 : depthA * 0.08;
        if (opacity < 0.005) continue;

        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.strokeStyle = a.node.color + hex2(opacity);
        ctx.lineWidth = isHighlit ? 1.2 : 0.5;
        ctx.stroke();
      }

      // --- Nodes (back-to-front) ---
      const sorted = [...proj].sort((a, b) => a.z - b.z);

      for (const { px, py, z, node } of sorted) {
        const phase = node.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const freq = 0.7 + (phase % 11) * 0.12;
        const pulse = 1 + Math.sin(t * freq * Math.PI * 2 + phase * 0.41) * 0.14;

        // Rare "firing" spike
        const fireRaw = Math.sin(t * (0.08 + (phase % 7) * 0.04) * Math.PI * 2 + phase * 1.9);
        const fire = Math.pow(Math.max(0, fireRaw), 9);

        // Depth: nodes at front are full brightness, nodes at back are dim
        const depthV = Math.max(0, z + 1) / 2; // 0 (back) → 1 (front)

        const baseR = Math.sqrt(node.val ?? 1) * 2.4 * pulse * (0.6 + depthV * 0.5) * dpr;
        const r = baseR;

        const isHovered = hov === node.id;
        const isAdjHov = hovAdj?.has(node.id);

        // Outer glow
        const glowIntensity = (0.07 + fire * 0.28) * depthV + (isHovered ? 0.3 : 0) + (isAdjHov ? 0.1 : 0);
        if (glowIntensity > 0.01) {
          const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 3.5);
          grd.addColorStop(0, node.color + hex2(glowIntensity));
          grd.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(px, py, r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Node core
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        const coreA = 0.35 + depthV * 0.65 + (isHovered ? 0.2 : 0);
        ctx.fillStyle = node.color + hex2(Math.min(1, coreA));
        ctx.fill();

        // White-hot centre on fire
        if (fire > 0.4) {
          ctx.beginPath();
          ctx.arc(px, py, r * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${(fire * 0.85).toFixed(2)})`;
          ctx.fill();
        }

        // Label on hover
        if (isHovered && z > -0.15) {
          const label = node.label;
          const fontSize = 11 * dpr;
          ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
          ctx.textAlign = "center";
          // Background pill
          const tw = ctx.measureText(label).width;
          const pad = 5 * dpr;
          const lh = fontSize + pad * 2;
          const lx = px - tw / 2 - pad;
          const ly = py - r - lh - 4 * dpr;
          ctx.fillStyle = "rgba(7,9,13,0.85)";
          ctx.beginPath();
          ctx.roundRect(lx, ly, tw + pad * 2, lh, 4 * dpr);
          ctx.fill();
          ctx.fillStyle = "#f0f4f8ee";
          ctx.fillText(label, px, ly + fontSize + pad * 0.5);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [nodes, links]);

  // --- Mouse handlers ---
  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const findHovered = useCallback(
    (mx: number, my: number): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2 / dpr;
      const cy = H / 2 / dpr;
      const R = Math.min(W, H) * 0.36 / dpr;
      const s = state.current;

      let best: string | null = null;
      let bestDist = 18; // px threshold

      nodes.forEach((node, i) => {
        const pos = positions.current[i] ?? [0, 0, 0];
        let p = rotX(pos as [number, number, number], s.rotX);
        p = rotY(p, s.rotY);
        const [x, y, z] = p;
        if (z < -0.3) return;
        const scale = 1 + z * 0.15;
        const px = cx + x * R * scale;
        const py = cy + y * R * scale;
        const dist = Math.hypot(mx - px, my - py);
        if (dist < bestDist) { bestDist = dist; best = node.id; }
      });

      return best;
    },
    [nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasPos(e);
      const s = state.current;

      if (s.dragging) {
        const dx = x - s.lastX;
        const dy = y - s.lastY;
        s.rotY += dx * 0.006;
        s.rotX = Math.max(-1.2, Math.min(1.2, s.rotX + dy * 0.006));
        s.lastX = x;
        s.lastY = y;
        return;
      }

      const hit = findHovered(x, y);
      state.current.hoverId = hit;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? "pointer" : "grab";
      }
    },
    [getCanvasPos, findHovered]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasPos(e);
      state.current.dragging = true;
      state.current.lastX = x;
      state.current.lastY = y;
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    },
    [getCanvasPos]
  );

  const handleMouseUp = useCallback(() => {
    state.current.dragging = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (state.current.dragging) return;
      const { x, y } = getCanvasPos(e);
      const hit = findHovered(x, y);
      if (hit) {
        const node = nodes.find((n) => n.id === hit);
        if (node) router.push(node.href);
      }
    },
    [getCanvasPos, findHovered, nodes, router]
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: "grab" }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    />
  );
}
