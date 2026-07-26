export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { publicStats } from "@/lib/prophecy/public";
import { Label, PageHead } from "./shared";

export const metadata = {
  title: "Prophecy claims — Artificial Atheist",
  description:
    "A structured, source-preserving knowledge base of prophecy claims: the original lists kept verbatim, the claims they assert normalized and reviewed.",
};

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card p-5">
      <p className="text-2xl font-bold">{n.toLocaleString()}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default async function ProphecyLandingPage() {
  const stats = await publicStats(prisma);

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        title="Prophecy claims"
        lead={
          <>
            Circulated lists of &ldquo;fulfilled prophecies&rdquo; are collected here exactly as
            their sources published them, then separated into the distinct propositions they
            actually assert. The point is to make the structure visible: which entries repeat each
            other, which split one passage into several claims, and which bundle several claims
            into one line.
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat n={stats.sourceLists} label="Source lists" />
        <Stat n={stats.entries} label="Verbatim entries" />
        <Stat n={stats.publishedClaims} label="Published claims" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/prophecy/claims/" className="btn-primary px-4 py-2 text-sm">
          Browse claims →
        </Link>
        <Link href="/prophecy/lists/" className="btn-ghost px-4 py-2 text-sm">
          Browse source lists
        </Link>
      </div>

      <section className="card p-6">
        <Label>How to read this</Label>
        <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            A <strong>source-list entry</strong> is one line as its publisher wrote it, preserved
            with its original wording, numbering, and references. A <strong>claim</strong> is a
            single neutral proposition, written so it can be examined on its own. One claim may be
            asserted by many entries across many lists, and one entry may assert several claims.
          </p>
          <p>
            Every entry shown on a claim page carries how it was matched — exact, partial,
            compound, duplicate — with a confidence and a written reason. Nothing here scores
            whether a claim is true; that is a separate editorial layer with its own citations and
            rationales.
          </p>
          {stats.publishedClaims === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No claims have completed review yet. The source lists below are already public,
              because they are provenance; normalized claims appear here as review publishes them.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
