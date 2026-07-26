// GET /review/prophecy/export/ — download the claims corpus.
// ?format=csv → CSV attachment; anything else → JSON attachment.
//
// Checks the shared admin cookie DIRECTLY: isAdminAuthed() is false both when
// the cookie is missing/stale and when ADMIN_TOKEN is unset, and either way
// the route answers 404 — an unset token means this surface doesn't exist.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { exportClaimsCSV, exportClaimsJSON } from "@/lib/prophecy/export";
import { isAdminAuthed } from "../../pipeline/auth";

export async function GET(request: Request): Promise<Response> {
  if (!(await isAdminAuthed())) {
    return new Response("not found", { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format");

  if (format === "csv") {
    const csv = await exportClaimsCSV(prisma);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="prophecy-claims.csv"',
      },
    });
  }

  const json = await exportClaimsJSON(prisma);
  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="prophecy-claims.json"',
    },
  });
}
