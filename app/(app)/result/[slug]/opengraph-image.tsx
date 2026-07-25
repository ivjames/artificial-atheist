import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { scoreLabel } from "@/lib/quiz";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AtheismIQ result";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { slug } = await Promise.resolve(params);
  const result = await prisma.result.findUnique({ where: { slug } });

  const score = result?.score ?? 0;
  const total = result?.total ?? 0;
  const label = result ? scoreLabel(score, total) : "AtheismIQ";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1f42f5 0%, #1c2c8f 100%)",
          color: "white",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          Atheism<span style={{ color: "#8eb6ff" }}>IQ</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 34, color: "#bcd3ff" }}>I scored</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
            <span style={{ fontSize: 180, fontWeight: 900, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 72, fontWeight: 700, color: "#8eb6ff", paddingBottom: 24 }}>
              / {total}
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 800, marginTop: 8 }}>
            {label}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#bcd3ff" }}>
          Think you can beat me? →
        </div>
      </div>
    ),
    { ...size },
  );
}
