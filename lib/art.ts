// Seeded geometric topic artwork, ported verbatim from the former Eleventy
// `topicPattern` shortcode in `.eleventy.js`. Deterministic from a seed string
// (the post slug) so each article gets a stable, distinct tessellation in its
// topic's color family. Colors reference CSS vars so light/dark adapt.

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const C = "var(--topic-color)";
const W = 280;
const H = 160;

function patScience(r: () => number): string {
  let s = "";
  const R = 19;
  const dx = R * 1.5;
  const dy = R * 0.866;
  let col = 0;
  for (let cx = -R; cx < W + R; cx += dx) {
    const off = col % 2 ? dy : 0;
    col++;
    for (let cy = -R + off; cy < H + R; cy += dy * 2) {
      const p: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i);
        p.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
      }
      const f = r() < 0.18 ? `fill="${C}" opacity="0.16"` : `fill="none"`;
      s += `<polygon points="${p.join(" ")}" ${f} stroke="${C}" stroke-width="0.6" opacity="0.4"/>`;
    }
  }
  return s;
}

function patPhilosophy(r: () => number): string {
  const cols = 8;
  const rows = 5;
  const w = W / cols;
  const h = H / rows;
  let s = "";
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const cx = x * w + w / 2;
      const cy = y * h + h / 2;
      const p = `${cx},${(cy - h / 2).toFixed(1)} ${(cx + w / 2).toFixed(1)},${cy} ${cx},${(cy + h / 2).toFixed(1)} ${(cx - w / 2).toFixed(1)},${cy}`;
      const f = r() < 0.18 ? `fill="${C}" opacity="0.16"` : `fill="none"`;
      s += `<polygon points="${p}" ${f} stroke="${C}" stroke-width="0.55" opacity="0.4"/>`;
    }
  return s;
}

function patSecularism(r: () => number): string {
  const cols = 7;
  const rows = 4;
  const w = W / cols;
  const h = H / rows;
  let s = "";
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const x0 = x * w;
      const y0 = y * h;
      const up = (x + y) % 2 === 0;
      const pts = up
        ? `${x0},${y0 + h} ${x0 + w / 2},${y0} ${x0 + w},${y0 + h}`
        : `${x0},${y0} ${x0 + w / 2},${y0 + h} ${x0 + w},${y0}`;
      const f = r() < 0.2 ? `fill="${C}" opacity="0.18"` : `fill="none"`;
      s += `<polygon points="${pts}" ${f} stroke="${C}" stroke-width="0.5" opacity="0.42"/>`;
    }
  return s;
}

function patReligion(_r: () => number): string {
  let s = "";
  const R = 24;
  const dx = R * 1.5;
  const dy = R * 0.866;
  let col = 0;
  for (let cx = 0; cx < W + R; cx += dx) {
    const off = col % 2 ? dy : 0;
    col++;
    for (let cy = off; cy < H + R; cy += dy * 2) {
      const v: number[][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i);
        v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
      const hexP = v.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" ");
      s += `<polygon points="${hexP}" fill="none" stroke="${C}" stroke-width="0.5" opacity="0.34"/>`;
      for (let i = 0; i < 6; i += 2)
        s += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${v[i][0].toFixed(1)}" y2="${v[i][1].toFixed(1)}" stroke="${C}" stroke-width="0.5" opacity="0.34"/>`;
    }
  }
  return s;
}

function patNews(r: () => number): string {
  const cols = 8;
  const bw = W / cols;
  const bh = H / 3.5;
  let s = "";
  for (let x = 0; x < cols; x++) {
    const off = x % 2 ? -bh / 2 : 0;
    for (let y = off; y < H; y += bh) {
      const f = r() < 0.18 ? `fill="${C}" opacity="0.15"` : `fill="none"`;
      s += `<rect x="${(x * bw).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" ${f} stroke="${C}" stroke-width="0.5" opacity="0.4"/>`;
    }
  }
  return s;
}

const PATTERNS: Record<string, (r: () => number) => string> = {
  science: patScience,
  philosophy: patPhilosophy,
  secularism: patSecularism,
  religion: patReligion,
  news: patNews,
};

// Returns the inner SVG markup for a topic's seeded tessellation.
export function topicPattern(topic: string, seed: string): string {
  const key = String(topic).toLowerCase();
  const gen = PATTERNS[key] || patScience;
  const r = rng(hashSeed(seed || topic));
  return `<svg class="art-rings" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice"><rect width="280" height="160" fill="var(--bg-tint)"/>${gen(r)}</svg>`;
}

export const TOPIC_ICONS: Record<string, string> = {
  science: "ti-microscope",
  philosophy: "ti-brain",
  secularism: "ti-building-bank",
  religion: "ti-book",
  news: "ti-broadcast",
};
