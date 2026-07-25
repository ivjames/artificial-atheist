import { NextRequest } from "next/server";
import { listArticles, searchArticles } from "@/lib/articles";

// Article corpus query endpoint (DB-backed read model). Dynamic — reflects the
// latest sync. Consumers: the debate chat (citing posts), the quiz, and any
// external integration. Read-only, no PII.
//
//   GET /api/articles?q=fine-tuning        → keyword search
//   GET /api/articles?topic=science&limit=5 → list by topic
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const topic = searchParams.get("topic")?.trim() || undefined;
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : undefined;

  const articles = q
    ? await searchArticles(q, limit ?? 5)
    : await listArticles({ topic, limit });

  return Response.json({ articles });
}
