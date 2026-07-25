import { nav } from "@/lib/site";

// Published for backward compatibility (the nav used to be fetched over HTTP
// by the separate quiz app). Now the layout imports lib/site directly, but
// keeping /nav.json avoids breaking any external consumer or bookmark.
export const dynamic = "force-static";

export function GET() {
  return Response.json(nav);
}
