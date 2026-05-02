import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "The Axiom";
  const category = searchParams.get("category") ?? "";
  const color = searchParams.get("color") ?? "#22d3ee";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#07090d",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "600px",
            height: "400px",
            background: `radial-gradient(ellipse, ${color}12 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Accent bar */}
        <div
          style={{
            width: "48px",
            height: "3px",
            background: color,
            marginBottom: "32px",
            borderRadius: "2px",
          }}
        />

        {category && (
          <p
            style={{
              fontSize: "14px",
              color: color,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: "20px",
              fontFamily: "monospace",
              opacity: 0.8,
            }}
          >
            {category}
          </p>
        )}

        <h1
          style={{
            fontSize: title.length > 40 ? "52px" : "68px",
            color: "#f0f4f8",
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            margin: "0 0 32px",
            fontFamily: "Georgia, serif",
            maxWidth: "900px",
          }}
        >
          {title}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px", color, fontFamily: "monospace", opacity: 0.6 }}>⬡</span>
          <p
            style={{
              fontSize: "16px",
              color: "#4a5568",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            elliot-digital.co.uk
          </p>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
