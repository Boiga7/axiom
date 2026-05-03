"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Node = { id: string; label: string; category: string; href: string; color: string; val: number; };
type Link = { source: string; target: string; };
type Props = { nodes: Node[]; links: Link[]; };

// Evenly distribute n points on a unit sphere
function fibonacciSphere(n: number): [number, number, number][] {
  const phi = (1 + Math.sqrt(5)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = Math.acos(1 - 2 * (i + 0.5) / n);
    const az = 2 * Math.PI * i / phi;
    return [Math.sin(t) * Math.cos(az), Math.cos(t), Math.sin(t) * Math.sin(az)];
  });
}

function rotY([x, y, z]: [number, number, number], a: number): [number, number, number] {
  return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
}

function rotX([x, y, z]: [number, number, number], a: number): [number, number, number] {
  return [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
}

// Pre-compute sphere wireframe: meridians + parallels
function buildWireframe(STEPS = 80): [number, number, number][][] {
  const lines: [number, number, number][][] = [];
  for (let i = 0; i < 10; i++) {
    const lon = (i / 10) * Math.PI * 2;
    const line: [number, number, number][] = [];
    for (let j = 0; j <= STEPS; j++) {
      const lat = (j / STEPS) * Math.PI - Math.PI / 2;
      line.push([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]);
    }
    lines.push(line);
  }
  for (let i = 1; i <= 5; i++) {
    const lat = (i / 6) * Math.PI - Math.PI / 2;
    const r = Math.cos(lat);
    const y = Math.sin(lat);
    const line: [number, number, number][] = [];
    for (let j = 0; j <= STEPS; j++) {
      const lon = (j / STEPS) * Math.PI * 2;
      line.push([r * Math.cos(lon), y, r * Math.sin(lon)]);
    }
    lines.push(line);
  }
  return lines;
}

const WIREFRAME = buildWireframe();

export default function GraphView({ nodes, links }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const state = useRef({
    rotY: 0,
    rotX: -0.2,
    dragging: false,
    didDrag: false,
    lastX: 0,
    lastY: 0,
    hoverId: null as string | null,
    selectedId: null as string | null,
    touchStartX: 0,
    touchStartY: 0,
    touchSelectedId: null as string | null,
    zoom: 1,
    lastPinchDist: 0,
  });

  const positions = useRef<[number, number, number][]>([]);
  const adj = useRef<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    positions.current = fibonacciSphere(nodes.length);
    const map = new Map<string, Set<string>>();
    for (const n of nodes) map.set(n.id, new Set());
    for (const l of links) {
      map.get(l.source as string)?.add(l.target as string);
      map.get(l.target as string)?.add(l.source as string);
    }
    adj.current = map;
  }, [nodes, links]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 20 : 1);
      state.current.zoom = Math.max(0.35, Math.min(3, state.current.zoom - delta * 0.001));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

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
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.37 * state.current.zoom;

      ctx.clearRect(0, 0, W, H);

      if (!state.current.dragging && !state.current.selectedId) {
        state.current.rotY += 0.0006;
      }

      const s = state.current;

      // Orthographic projection: no z-based position scaling
      const project = (p3: [number, number, number]) => {
        let p = rotX(p3, s.rotX);
        p = rotY(p, s.rotY);
        const [x, y, z] = p;
        return { x: cx + x * R, y: cy + y * R, z };
      };

      // --- WIREFRAME ---
      ctx.lineWidth = 0.5;
      for (const line of WIREFRAME) {
        ctx.beginPath();
        let prevZ = 1;
        for (const p3 of line) {
          const { x, y, z } = project(p3);
          if (z <= 0) {
            if (prevZ > 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          prevZ = z;
        }
        ctx.strokeStyle = "rgba(71, 85, 105, 0.18)";
        ctx.stroke();
      }
      for (const line of WIREFRAME) {
        ctx.beginPath();
        let prevZ = -1;
        for (const p3 of line) {
          const { x, y, z } = project(p3);
          if (z > 0) {
            if (prevZ <= 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          prevZ = z;
        }
        ctx.strokeStyle = "rgba(71, 85, 105, 0.32)";
        ctx.stroke();
      }

      // --- PROJECT ALL NODES ---
      const proj = nodes.map((node, i) => {
        const pos = positions.current[i] ?? [0, 0, 0] as [number, number, number];
        const { x, y, z } = project(pos);
        return { px: x, py: y, z, node };
      });

      // --- EDGES ---
      const sel = s.selectedId;
      const selAdj = sel ? adj.current.get(sel) : null;

      for (const l of links) {
        const ai = nodes.findIndex((n) => n.id === l.source);
        const bi = nodes.findIndex((n) => n.id === l.target);
        if (ai < 0 || bi < 0) continue;
        const a = proj[ai];
        const b = proj[bi];
        if (a.z < -0.55 && b.z < -0.55) continue;

        const isSelEdge = sel && (a.node.id === sel || b.node.id === sel);

        if (isSelEdge) {
          const depth = Math.max(0, (a.z + b.z) / 2 + 0.55) / 1.55;
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.strokeStyle = a.node.color + Math.round(depth * 0.75 * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 0.9;
          ctx.stroke();
        } else {
          const depth = Math.max(0, (a.z + b.z) / 2 + 0.55) / 1.55;
          const opacity = depth * 0.09;
          if (opacity < 0.005) continue;
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.strokeStyle = `rgba(148, 163, 184, ${opacity})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      // --- NODES (back to front) ---
      const sorted = [...proj].sort((a, b) => a.z - b.z);

      for (const { px, py, z, node } of sorted) {
        const depthV = Math.max(0, z + 1) / 2;
        const isSelected = sel === node.id;
        const isAdj = selAdj?.has(node.id);

        const r = (1.4 + Math.sqrt(node.val ?? 1) * 0.45) * (0.4 + depthV * 0.6) * dpr;
        const alpha = Math.min(1, 0.3 + depthV * 0.7 + (isSelected ? 0.2 : isAdj ? 0.1 : 0));

        if (isSelected) {
          const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 5);
          grd.addColorStop(0, node.color + "28");
          grd.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(px, py, r * 5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Label only for selected node; pixel-snap for crisp rendering
        if (isSelected && z > -0.1) {
          const rpx = Math.round(px);
          const rpy = Math.round(py);
          const fontSize = Math.round(11 * dpr);
          ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
          ctx.textAlign = "center";
          const tw = ctx.measureText(node.label).width;
          const pad = Math.round(5 * dpr);
          const pillW = Math.round(tw + pad * 2);
          const pillH = Math.round(fontSize + pad * 1.6);
          const lx = Math.round(rpx - pillW / 2);
          const ly = Math.round(rpy - r - pillH - 6 * dpr);

          ctx.fillStyle = "rgba(7, 9, 13, 0.92)";
          ctx.beginPath();
          ctx.roundRect(lx, ly, pillW, pillH, 3 * dpr);
          ctx.fill();

          ctx.strokeStyle = node.color + "55";
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();

          ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
          ctx.fillText(node.label, rpx, Math.round(ly + fontSize + pad * 0.55));
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [nodes, links]);

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
      const R = Math.min(W, H) * 0.37 / dpr * state.current.zoom;
      const s = state.current;

      let best: string | null = null;
      let bestDist = 20;

      nodes.forEach((node, i) => {
        const pos = positions.current[i] ?? [0, 0, 0] as [number, number, number];
        let p = rotX(pos, s.rotX);
        p = rotY(p, s.rotY);
        const [x, y, z] = p;
        if (z < -0.3) return;
        const px = cx + x * R;
        const py = cy + y * R;
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
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) s.didDrag = true;
        s.rotY += dx * 0.006;
        s.rotX = Math.max(-1.2, Math.min(1.2, s.rotX + dy * 0.006));
        s.lastX = x; s.lastY = y;
        return;
      }
      const hit = findHovered(x, y);
      state.current.hoverId = hit;
      if (canvasRef.current) canvasRef.current.style.cursor = hit ? "pointer" : "grab";
    },
    [getCanvasPos, findHovered]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasPos(e);
      state.current.dragging = true;
      state.current.didDrag = false;
      state.current.lastX = x; state.current.lastY = y;
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
      if (state.current.didDrag) {
        state.current.didDrag = false;
        return;
      }
      const { x, y } = getCanvasPos(e);
      const hit = findHovered(x, y);
      if (hit) {
        if (state.current.selectedId === hit) {
          // Second click on already-selected node → navigate
          const node = nodes.find((n) => n.id === hit);
          if (node) router.push(node.href);
        } else {
          // First click → select and show label
          state.current.selectedId = hit;
        }
      } else {
        // Click on empty space → deselect
        state.current.selectedId = null;
      }
    },
    [getCanvasPos, findHovered, nodes, router]
  );

  const getCanvasTouchPos = useCallback((touch: React.Touch) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        state.current.lastPinchDist = Math.hypot(dx, dy);
        state.current.dragging = false;
        return;
      }
      const { x, y } = getCanvasTouchPos(e.touches[0]);
      state.current.dragging = true;
      state.current.lastX = x; state.current.lastY = y;
      state.current.touchStartX = x; state.current.touchStartY = y;
    },
    [getCanvasTouchPos]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / (state.current.lastPinchDist || dist);
        state.current.zoom = Math.max(0.35, Math.min(3, state.current.zoom * ratio));
        state.current.lastPinchDist = dist;
        return;
      }
      const { x, y } = getCanvasTouchPos(e.touches[0]);
      const s = state.current;
      if (s.dragging) {
        s.rotY += (x - s.lastX) * 0.006;
        s.rotX = Math.max(-1.2, Math.min(1.2, s.rotX + (y - s.lastY) * 0.006));
        s.lastX = x; s.lastY = y;
      }
    },
    [getCanvasTouchPos]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length > 0) { state.current.dragging = false; return; }
      const s = state.current;
      s.dragging = false;
      const { x, y } = getCanvasTouchPos(e.changedTouches[0]);
      const dx = Math.abs(x - s.touchStartX);
      const dy = Math.abs(y - s.touchStartY);
      if (dx < 10 && dy < 10) {
        const hit = findHovered(x, y);
        if (hit) {
          if (s.selectedId === hit) {
            // Second tap → navigate
            const node = nodes.find((n) => n.id === hit);
            if (node) router.push(node.href);
          } else {
            // First tap → select
            s.selectedId = hit;
          }
        } else {
          s.selectedId = null;
        }
      }
    },
    [getCanvasTouchPos, findHovered, nodes, router]
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: "grab", touchAction: "none" }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}
