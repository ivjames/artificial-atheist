export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listSourceLists } from "@/lib/prophecy/public";
import { Muted, PageHead } from "../shared";

export const metadata = {
  title: "Prophecy source lists",
};

export default async function PublicListsPage() {
  const lists = await listSourceLists(prisma);

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Source lists"
        lead={
          <>
            Each list is preserved exactly as published, including its own numbering and wording.
            &ldquo;Claimed&rdquo; is the total the source advertises; &ldquo;contains&rdquo; is
            what the page actually holds. Where those differ, both are shown.
          </>
        }
      />

      {lists.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500 dark:text-slate-400">
          No source lists have been imported yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lists.map((l) => {
            const mismatch = l.claimedCount != null && l.claimedCount !== l.entryCount;
            return (
              <Link key={l.id} href={`/prophecy/lists/${l.slug}/`} className="card block p-5">
                <p className="font-semibold">{l.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  {l.claimedCount != null ? (
                    <span>
                      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Claimed{" "}
                      </span>
                      <strong>{l.claimedCount}</strong>
                    </span>
                  ) : null}
                  <span>
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Contains{" "}
                    </span>
                    <strong className={mismatch ? "text-amber-700 dark:text-amber-400" : ""}>
                      {l.entryCount}
                    </strong>
                  </span>
                  <Muted>
                    {l.publishedMappedCount} of {l.entryCount} entries mapped to a published claim
                  </Muted>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
