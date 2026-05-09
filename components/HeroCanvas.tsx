"use client";
import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const NODE_COUNT = 30;
const PROXIMITY = 120;
const RGB = "34,211,238"; // #22d3ee

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * (canvas.width || 800),
      y: Math.random() * (canvas.height || 300),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    document.addEventListener("mousemove", onMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const node of nodes) {
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 200) {
          node.vx += (dx / dist) * 0.02;
          node.vy += (dy / dist) * 0.02;
        }
        node.vx *= 0.99;
        node.vy *= 0.99;
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0) node.x = canvas.width;
        if (node.x > canvas.width) node.x = 0;
        if (node.y < 0) node.y = canvas.height;
        if (node.y > canvas.height) node.y = 0;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${RGB},0.6)`;
        ctx.fill();
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < PROXIMITY) {
            const opacity = (1 - dist / PROXIMITY) * 0.15;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${RGB},${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}
