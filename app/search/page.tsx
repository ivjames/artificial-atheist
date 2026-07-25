import type { Metadata } from "next";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search",
  alternates: { canonical: "/search/" },
};

// Ported from the former Eleventy search.md (Pagefind → client index search).
export default function SearchPage() {
  return (
    <div className="aa-pub">
      <div className="wrap">
        <div className="article">
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-h1)",
              fontWeight: 500,
              marginBottom: "1.5rem",
            }}
          >
            Search
          </h1>
          <SearchClient />
          <noscript>
            <p style={{ color: "var(--text-soft)" }}>
              Search requires JavaScript. You can also{" "}
              <a href="/topics/science/">browse by topic</a>.
            </p>
          </noscript>
        </div>
      </div>
    </div>
  );
}
