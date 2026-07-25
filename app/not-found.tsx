import Link from "next/link";

// Branded 404, ported from the former Eleventy src/404.html.
export default function NotFound() {
  return (
    <div className="aa-pub">
      <div className="wrap">
        <div className="article" style={{ textAlign: "center" }}>
          <span className="tag" style={{ color: "var(--text-soft)" }}>
            <i className="ti ti-error-404" /> 404
          </span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-h1)",
              fontWeight: 500,
              margin: "0.5rem 0 1rem",
            }}
          >
            I don't believe this page exists
          </h1>
          <p style={{ color: "var(--text-soft)", maxWidth: "52ch", margin: "0 auto 2rem" }}>
            The link may be broken or the article may have moved. Try searching, or browse by
            topic.
          </p>
          <p style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="read-link" style={{ marginLeft: 0 }} href="/">
              <i className="ti ti-home" /> Home
            </Link>
            <Link className="read-link" style={{ marginLeft: 0 }} href="/search/">
              <i className="ti ti-search" /> Search
            </Link>
            <Link className="read-link" style={{ marginLeft: 0 }} href="/topics/science/">
              <i className="ti ti-microscope" /> Browse topics
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
