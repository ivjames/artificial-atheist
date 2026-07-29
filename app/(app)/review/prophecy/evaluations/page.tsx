export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import {
  type DimensionChartRow,
  DIMENSION_KIND_LABELS,
  SUMMARY_FORMULA,
  dimensionLabel,
  evaluationChartData,
  evaluationDisagreements,
} from "@/lib/prophecy/evaluations";
import { PROPHECY_VOCAB, SCORE_LABELS } from "@/lib/prophecy/vocab";
import { PageHead, requireProphecyPageAuth, truncate } from "../shared";

// Prophecy admin — evaluation overview, chart edition.
//
// The numbers are the same corpus aggregate the text version showed; here they
// are drawn, so a reader sees the SHAPE of the corpus at a glance:
//   1. Mean per dimension, grouped into the two rubric families — the headline.
//   2. Score composition per dimension — the distribution behind each mean.
//   3. Overall distribution + how much the rater passes agree.
//   4. Mean per claim category.
//   5. The rater-disagreement queue — the one part that is a work list, not a
//      picture, so it stays as rows.
//
// SERVER-COMPONENTS ONLY, still. Every chart is inline SVG rendered on the
// server; hover text is a native <title>, not JS. Theme-aware fills come from
// CSS custom properties toggled under [data-theme="dark"] (the app's dark
// selector) — no client component, so this surface keeps its no-JS rule.
//
// On colour: the score ramp runs weak (red) → strong (blue). A high score is
// favourable ON THAT AXIS — it is NOT a verdict on the claim (see the callout
// under the first chart, and SUMMARY_FORMULA). The per-dimension numbers, not
// this colouring, remain the finding.

const LABELS = SCORE_LABELS.map((l) => l.replace(/_/g, " "));

// Dimension descriptions, straight from the controlled vocabulary, used as the
// hover <title> on each bar so "what a high score means" is always one hover
// away.
const DIM_DESC: Record<string, string> = Object.fromEntries(
  PROPHECY_VOCAB.filter(
    (t) => t.kind === "prediction_dimension" || t.kind === "fulfillment_dimension",
  ).map((t) => [t.key, t.description ?? ""]),
);

type FamilyGroup = { kind: string; title: string; rows: DimensionChartRow[] };

// Prediction quality before fulfillment quality — you judge whether something
// was a prediction before whether it came true.
const FAMILY_ORDER: Array<{ kind: string; title: string }> = [
  { kind: "prediction_dimension", title: "Prediction quality" },
  { kind: "fulfillment_dimension", title: "Fulfillment quality" },
];

function groupByFamily(perDimension: DimensionChartRow[]): FamilyGroup[] {
  return FAMILY_ORDER.map((f) => ({
    ...f,
    rows: perDimension
      .filter((d) => d.dimensionKind === f.kind)
      .sort((a, b) => b.mean - a.mean),
  })).filter((g) => g.rows.length > 0);
}

const famMean = (rows: DimensionChartRow[]) =>
  rows.reduce((s, d) => s + d.mean, 0) / rows.length;

// Score → one of the six ramp variables, bucketed to the nearest whole score
// so the bar colour matches its label on the legend.
const meanVar = (m: number) => `var(--s${Math.max(0, Math.min(5, Math.round(m)))})`;

// --- stat tile (as before) --------------------------------------------------

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</div> : null}
    </div>
  );
}

// --- chart 1: mean by dimension, grouped by family --------------------------

function MeanByDimensionChart({
  groups,
  overallMean,
}: {
  groups: FamilyGroup[];
  overallMean: number;
}) {
  const W = 760;
  const rowH = 22, gap = 6, headH = 28, famGap = 16, padL = 176, padR = 44, padT = 24, padB = 8;
  const plotW = W - padL - padR;
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const H =
    padT + padB + groups.length * headH + total * (rowH + gap) + (groups.length - 1) * famGap - gap;
  const x = (v: number) => padL + (v / 5) * plotW;
  const els: ReactNode[] = [];

  for (let g = 0; g <= 5; g++) {
    els.push(
      <line key={`g${g}`} x1={x(g)} y1={padT - 6} x2={x(g)} y2={H - padB} strokeWidth={1}
        className="stroke-slate-200 dark:stroke-slate-800" />,
    );
    els.push(
      <text key={`gt${g}`} x={x(g)} y={padT - 11} textAnchor="middle" fontSize={11}
        className="fill-slate-400 dark:fill-slate-500 tabular-nums">{g}</text>,
    );
  }
  els.push(
    <line key="ref" x1={x(overallMean)} y1={padT - 6} x2={x(overallMean)} y2={H - padB}
      className="stroke-amber-500" strokeWidth={1.5} strokeDasharray="3 3" />,
  );

  let y = padT;
  for (const grp of groups) {
    els.push(
      <text key={`h-${grp.kind}`} x={0} y={y + headH - 12} fontSize={11}
        className="fill-slate-900 font-bold tracking-wider dark:fill-slate-100">
        {grp.title.toUpperCase()}
      </text>,
    );
    els.push(
      <text key={`ha-${grp.kind}`} x={W} y={y + headH - 12} textAnchor="end" fontSize={11}
        className="fill-slate-400 dark:fill-slate-500 tabular-nums">
        family avg {famMean(grp.rows).toFixed(2)}
      </text>,
    );
    els.push(
      <line key={`hr-${grp.kind}`} x1={0} y1={y + headH - 4} x2={W} y2={y + headH - 4} strokeWidth={1}
        className="stroke-slate-300 dark:stroke-slate-700" />,
    );
    y += headH;
    for (const d of grp.rows) {
      const bw = Math.max(2, x(d.mean) - padL);
      const rowY = y;
      els.push(
        <text key={`n-${d.dimensionKey}`} x={padL - 12} y={rowY + rowH / 2 + 4} textAnchor="end"
          fontSize={12} className="fill-slate-600 dark:fill-slate-300">{d.label}</text>,
      );
      els.push(
        <rect key={`b-${d.dimensionKey}`} x={padL} y={rowY} width={bw} height={rowH} rx={4}
          style={{ fill: meanVar(d.mean) }}>
          <title>{`${d.label}\n${DIM_DESC[d.dimensionKey] ?? ""}\nmean ${d.mean.toFixed(2)} · ${d.n} ratings · higher = more true of these claims`}</title>
        </rect>,
      );
      els.push(
        <text key={`v-${d.dimensionKey}`} x={x(d.mean) + 7} y={rowY + rowH / 2 + 4} fontSize={12}
          className="fill-slate-900 font-semibold tabular-nums dark:fill-slate-50">
          {d.mean.toFixed(2)}
        </text>,
      );
      y += rowH + gap;
    }
    y += famGap;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="h-auto w-full"
      style={{ overflow: "visible" }}
      aria-label="Mean score by dimension, grouped by rubric family">
      {els}
    </svg>
  );
}

// --- chart 2: score composition per dimension (100% stacked) ----------------

function CompositionChart({ groups }: { groups: FamilyGroup[] }) {
  const W = 760;
  const rowH = 20, gap = 6, headH = 24, famGap = 12, padL = 176, padR = 8, padT = 6, padB = 20;
  const plotW = W - padL - padR;
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const H =
    padT + padB + groups.length * headH + total * (rowH + gap) + (groups.length - 1) * famGap - gap;
  const els: ReactNode[] = [];

  let y = padT;
  for (const grp of groups) {
    els.push(
      <text key={`h-${grp.kind}`} x={0} y={y + headH - 9} fontSize={11}
        className="fill-slate-900 font-bold tracking-wider dark:fill-slate-100">
        {grp.title.toUpperCase()}
      </text>,
    );
    els.push(
      <line key={`hr-${grp.kind}`} x1={0} y1={y + headH - 3} x2={W} y2={y + headH - 3} strokeWidth={1}
        className="stroke-slate-300 dark:stroke-slate-700" />,
    );
    y += headH;
    for (const d of grp.rows) {
      const rowY = y;
      els.push(
        <text key={`n-${d.dimensionKey}`} x={padL - 12} y={rowY + rowH / 2 + 4} textAnchor="end"
          fontSize={12} className="fill-slate-600 dark:fill-slate-300">{d.label}</text>,
      );
      let acc = 0;
      for (let si = 0; si < 6; si++) {
        const c = d.counts[si];
        if (!c) continue;
        const frac = c / d.n;
        const segW = frac * plotW;
        const gapPx = segW > 2 ? 1.5 : 0;
        els.push(
          <rect key={`s-${d.dimensionKey}-${si}`} x={padL + acc} y={rowY}
            width={Math.max(0.5, segW - gapPx)} height={rowH} rx={si === 0 || si === 5 ? 2 : 0}
            style={{ fill: `var(--s${si})` }}>
            <title>{`${d.label} — ${si} · ${LABELS[si]}: ${c} (${Math.round(frac * 100)}%)`}</title>
          </rect>,
        );
        acc += segW;
      }
      y += rowH + gap;
    }
    y += famGap;
  }

  for (const p of [0, 25, 50, 75, 100]) {
    els.push(
      <text key={`ax${p}`} x={padL + (p / 100) * plotW} y={H - 6} fontSize={11}
        textAnchor={p === 0 ? "start" : p === 100 ? "end" : "middle"}
        className="fill-slate-400 dark:fill-slate-500 tabular-nums">{p}%</text>,
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="h-auto w-full"
      style={{ overflow: "visible" }}
      aria-label="Score composition by dimension, grouped 100% stacked bars">
      {els}
    </svg>
  );
}

// --- chart 3 + 4: vertical bar charts (distribution, rater agreement) --------

function VBarChart({
  bars,
  useScoreColors,
  label,
  ariaLabel,
}: {
  bars: Array<{ value: number; pct: number; x1: string; x2?: string; tip: string }>;
  useScoreColors: boolean;
  label: string;
  ariaLabel: string;
}) {
  const W = 380, H = 250, padL = 38, padR = 8, padT = 16, padB = 46;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const n = bars.length;
  const step = plotW / n, bw = step * 0.6;
  const els: ReactNode[] = [];

  for (let g = 0; g <= 4; g++) {
    const yy = padT + plotH - (g / 4) * plotH;
    els.push(
      <line key={`g${g}`} x1={padL} y1={yy} x2={W - padR} y2={yy} strokeWidth={1}
        className="stroke-slate-200 dark:stroke-slate-800" />,
    );
    const v = (max * g) / 4;
    els.push(
      <text key={`gt${g}`} x={padL - 6} y={yy + 3} textAnchor="end" fontSize={10}
        className="fill-slate-400 dark:fill-slate-500 tabular-nums">
        {g === 0 ? "0" : v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
      </text>,
    );
  }

  bars.forEach((b, i) => {
    const h = (b.value / max) * plotH;
    const xx = padL + i * step + (step - bw) / 2;
    const yy = padT + plotH - h;
    els.push(
      <rect key={`b${i}`} x={xx} y={yy} width={bw} height={Math.max(h, b.value > 0 ? 1.5 : 0)} rx={4}
        style={useScoreColors ? { fill: `var(--s${i})` } : undefined}
        className={useScoreColors ? undefined : "fill-brand-600"}>
        <title>{b.tip}</title>
      </rect>,
    );
    els.push(
      <text key={`p${i}`} x={xx + bw / 2} y={yy - 6} textAnchor="middle" fontSize={11}
        className="fill-slate-900 font-semibold tabular-nums dark:fill-slate-50">
        {b.pct}%
      </text>,
    );
    els.push(
      <text key={`x${i}`} x={xx + bw / 2} y={H - 26} textAnchor="middle" fontSize={11}
        className="fill-slate-500 dark:fill-slate-400 tabular-nums">{b.x1}</text>,
    );
    if (b.x2) {
      els.push(
        <text key={`x2${i}`} x={xx + bw / 2} y={H - 14} textAnchor="middle" fontSize={9}
          className="fill-slate-400 dark:fill-slate-500">{b.x2}</text>,
      );
    }
  });

  els.push(
    <text key="cap" x={padL} y={H - 2} fontSize={10}
      className="fill-slate-400 dark:fill-slate-500">{label}</text>,
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="h-auto w-full"
      style={{ overflow: "visible" }} aria-label={ariaLabel}>
      {els}
    </svg>
  );
}

// --- chart 5: mean by category ----------------------------------------------

function ByCategoryChart({
  rows,
  overallMean,
}: {
  rows: Array<{ label: string; mean: number; n: number }>;
  overallMean: number;
}) {
  const W = 760;
  const rowH = 22, gap = 8, padL = 214, padR = 44, padT = 24, padB = 6;
  const plotW = W - padL - padR;
  const H = padT + padB + rows.length * (rowH + gap) - gap;
  const x = (v: number) => padL + (v / 5) * plotW;
  const els: ReactNode[] = [];

  for (let g = 0; g <= 5; g++) {
    els.push(
      <line key={`g${g}`} x1={x(g)} y1={padT - 6} x2={x(g)} y2={H - padB} strokeWidth={1}
        className="stroke-slate-200 dark:stroke-slate-800" />,
    );
    els.push(
      <text key={`gt${g}`} x={x(g)} y={padT - 11} textAnchor="middle" fontSize={11}
        className="fill-slate-400 dark:fill-slate-500 tabular-nums">{g}</text>,
    );
  }
  els.push(
    <line key="ref" x1={x(overallMean)} y1={padT - 6} x2={x(overallMean)} y2={H - padB}
      className="stroke-amber-500" strokeWidth={1.5} strokeDasharray="3 3" />,
  );

  rows.forEach((r, i) => {
    const rowY = padT + i * (rowH + gap);
    const bw = Math.max(2, x(r.mean) - padL);
    els.push(
      <text key={`n${i}`} x={padL - 12} y={rowY + rowH / 2 + 4} textAnchor="end" fontSize={12}
        className="fill-slate-600 dark:fill-slate-300">{`${r.label} (${r.n})`}</text>,
    );
    els.push(
      <rect key={`b${i}`} x={padL} y={rowY} width={bw} height={rowH} rx={4}
        style={{ fill: meanVar(r.mean) }}>
        <title>{`${r.label}\nmean of ${r.n} claim means: ${r.mean.toFixed(2)}`}</title>
      </rect>,
    );
    els.push(
      <text key={`v${i}`} x={x(r.mean) + 7} y={rowY + rowH / 2 + 4} fontSize={12}
        className="fill-slate-900 font-semibold tabular-nums dark:fill-slate-50">
        {r.mean.toFixed(2)}
      </text>,
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="h-auto w-full"
      style={{ overflow: "visible" }} aria-label="Mean score by claim category">
      {els}
    </svg>
  );
}

// --- score legend -----------------------------------------------------------

function ScoreLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
      {LABELS.map((l, si) => (
        <span key={si} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px] ring-1 ring-black/10 dark:ring-white/10"
            style={{ backgroundColor: `var(--s${si})` }} />
          {si} · {l}
        </span>
      ))}
    </div>
  );
}

export default async function ProphecyEvaluationsPage() {
  await requireProphecyPageAuth();

  const [charts, disagreements] = await Promise.all([
    evaluationChartData(prisma),
    evaluationDisagreements(prisma, { minGap: 2 }),
  ]);

  const groups = groupByFamily(charts.perDimension);
  const overallMean =
    charts.perDimension.length > 0
      ? charts.perDimension.reduce((a, d) => a + d.mean, 0) / charts.perDimension.length
      : 0;
  const dimByKey = new Map(charts.perDimension.map((d) => [d.dimensionKey, d]));
  const priorDating = dimByKey.get("prior_dating")?.mean;
  const interpPredates = dimByKey.get("interpretation_predates")?.mean;

  const distTotal = charts.overallCounts.reduce((a, b) => a + b, 0);
  const distBars = charts.overallCounts.map((c, i) => ({
    value: c,
    pct: distTotal ? Math.round((c / distTotal) * 100) : 0,
    x1: String(i),
    tip: `${i} · ${LABELS[i]}: ${c.toLocaleString()} (${distTotal ? ((c / distTotal) * 100).toFixed(1) : "0"}%)`,
  }));
  const raterBars = charts.raterDiffs.map((c, i) => ({
    value: c,
    pct: charts.pairedCount ? Math.round((c / charts.pairedCount) * 100) : 0,
    x1: `±${i}`,
    tip: `gap of ${i} point${i === 1 ? "" : "s"}: ${c.toLocaleString()} pairs (${charts.pairedCount ? ((c / charts.pairedCount) * 100).toFixed(1) : "0"}%)`,
  }));
  const catRows = charts.byCategory.filter((c) => c.n >= 3);

  return (
    <div className="eval-charts mx-auto mt-8 flex max-w-4xl flex-col gap-8">
      {/* Theme-aware score ramp: weak (red) → strong (blue), stepped per mode.
          Scoped to .eval-charts; dark values swap under the app's dark selector. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            ".eval-charts{--s0:#7d251f;--s1:#c14b3f;--s2:#eba492;--s3:#a9caed;--s4:#4485cf;--s5:#164f96}" +
            '[data-theme="dark"] .eval-charts{--s0:#f2705f;--s1:#cc4c3f;--s2:#9e352c;--s3:#3a6aa0;--s4:#4c8fdb;--s5:#86b6f0}',
        }}
      />

      <PageHead
        title="Evaluations"
        blurb="Dimensional ratings across the claim corpus, charted. Scores are drafts produced by automated raters — not editorial judgement — and each one carries a written rationale on its claim page."
      />

      {charts.totalRatings === 0 ? (
        <div className="card p-6 text-sm text-slate-500 dark:text-slate-400">
          No evaluations loaded yet. Generate a pass with <code>npm run prophecy:evaluate</code>,
          then load it with <code>npm run prophecy:evals</code>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Overall mean" value={overallMean.toFixed(2)} hint="of 5 · formula below" />
            <Stat label="Ratings" value={charts.totalRatings.toLocaleString()} />
            <Stat label="Claims rated" value={charts.claimsRated.toLocaleString()} />
            <Stat
              label="Raters"
              value={charts.reviewerCount}
              hint={charts.reviewerCount === 1 ? "one pass — no splits" : "independent passes"}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>How the means are computed:</strong> {SUMMARY_FORMULA} The per-dimension scores
            below, and the per-rating scores on each claim page, are the actual finding — the
            overall number is a navigation aid, not a result.
          </p>

          {/* Chart 1 — mean by dimension, grouped */}
          <section className="card p-5">
            <h2 className="text-lg font-bold">Mean score by dimension</h2>
            <p className="mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-300">
              Split into the two rubric families — <strong>prediction quality</strong> (is the text
              a real, prior, specific prediction?) and <strong>fulfillment quality</strong> (did
              anything independent confirm it?). Each score is how well the claims do on that
              specific test; higher is better <em>for the prophecy</em>. Hover a bar for its
              definition. The dashed line is the overall mean ({overallMean.toFixed(2)}).
            </p>
            <div className="mt-4">
              <MeanByDimensionChart groups={groups} overallMean={overallMean} />
            </div>
            <aside className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-slate-600 dark:text-slate-300">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Reading a high score
              </span>
              A high score is favourable <strong>on that axis only</strong>. High{" "}
              <strong>prior dating</strong>
              {priorDating != null ? ` (${priorDating.toFixed(2)})` : ""} just means the text
              predates the event — a prerequisite for it being a prediction at all, not evidence it
              came true. Whether the outcome was then staged or the account retrofitted is scored
              separately, under the fulfillment-family resistance dimensions and under{" "}
              <strong>interpretation predates</strong>
              {interpPredates != null ? ` (${interpPredates.toFixed(2)})` : ""} — which sit far
              below prior dating. So the corpus clears the &ldquo;the text is old&rdquo; bar and
              collapses on &ldquo;and it wasn&rsquo;t gamed after the fact.&rdquo;
            </aside>
          </section>

          {/* Chart 2 — composition */}
          <section className="card p-5">
            <h2 className="text-lg font-bold">Score composition by dimension</h2>
            <p className="mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-300">
              The full shape behind each average — what share of ratings landed at each score. Same
              families, each ordered by mean. The blue (strong) mass is confined to the top of
              prediction quality and nearly absent from fulfillment quality.
            </p>
            <div className="mt-3">
              <ScoreLegend />
            </div>
            <div className="mt-4">
              <CompositionChart groups={groups} />
            </div>
          </section>

          {/* Charts 3 + 4 — distribution & rater agreement */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="card p-5">
              <h2 className="text-lg font-bold">Overall score distribution</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                All {charts.totalRatings.toLocaleString()} ratings pooled.
              </p>
              <div className="mt-4">
                <VBarChart
                  bars={distBars}
                  useScoreColors
                  label="score (0 absent → 5 very strong)"
                  ariaLabel="Overall score distribution"
                />
              </div>
            </section>
            <section className="card p-5">
              <h2 className="text-lg font-bold">Agreement between rater passes</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {charts.reviewerCount < 2
                  ? "Only one pass is loaded — nothing to compare yet."
                  : `Absolute gap between passes on the same claim + dimension (${charts.pairedCount.toLocaleString()} pairs).`}
              </p>
              <div className="mt-4">
                <VBarChart
                  bars={raterBars}
                  useScoreColors={false}
                  label="point difference between passes"
                  ariaLabel="Rater agreement distribution"
                />
              </div>
            </section>
          </div>

          {/* Chart 5 — by category */}
          {catRows.length > 0 ? (
            <section className="card p-5">
              <h2 className="text-lg font-bold">Mean score by claim category</h2>
              <p className="mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-300">
                Each claim&rsquo;s own average, grouped by the categories assigned to it (a claim can
                carry several). Categories with fewer than three claims are omitted; count in
                parentheses.
              </p>
              <div className="mt-4">
                <ByCategoryChart rows={catRows} overallMean={overallMean} />
              </div>
            </section>
          ) : null}

          {/* The one work list, not a picture */}
          <section className="card p-5">
            <h2 className="text-lg font-bold">Rater disagreements ({disagreements.length})</h2>
            {disagreements.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {charts.reviewerCount < 2
                  ? "Only one rating pass is loaded, so there is nothing to disagree about yet. Run a second pass with a different model to populate this queue — it is where reading time pays off most."
                  : "The raters agree within 1 point everywhere. Nothing needs adjudication."}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {disagreements.map((d) => (
                  <div
                    key={`${d.claimId}-${d.dimensionKey}`}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-400">
                        gap {d.gap}
                      </span>
                      <span className="font-semibold">{dimensionLabel(d.dimensionKey)}</span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {DIMENSION_KIND_LABELS[d.dimensionKind] ?? d.dimensionKind}
                      </span>
                    </div>
                    <a
                      href={`/review/prophecy/claims/${d.claimId}/`}
                      className="mt-2 block text-sm hover:underline"
                    >
                      {truncate(d.claimText, 160)}
                    </a>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {d.scores.map((s) => (
                        <div
                          key={s.reviewerSlug}
                          className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <code className="text-slate-500 dark:text-slate-400">
                              {s.reviewerSlug}
                            </code>
                            <span className="font-bold tabular-nums">{s.score}/5</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {s.rationale}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
