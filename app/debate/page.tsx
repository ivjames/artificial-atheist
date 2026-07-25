import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Debate",
  alternates: { canonical: "/debate/" },
};

// The Debate Agent explainer / funnel. Ported from the former Eleventy
// debate.md; links into the chat surface (/chat) and the quiz (/quiz).
export default function DebatePage() {
  return (
    <div className="aa-pub">
      <div className="wrap">
        <div className="article">
          <div className="prose">
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-h1)",
                fontWeight: 500,
                marginBottom: "1.5rem",
              }}
            >
              The Debate Agent
            </h1>
            <p>
              The Debate Agent is an AI designed to engage adults (18+) in rigorous,
              evidence-based philosophical argument. It argues from a naturalist,
              evidence-first position via Socratic questioning - exploring the logical
              coherence and empirical grounding of your claims rather than asserting
              conclusions.
            </p>
            <h2>Who this is for</h2>
            <p>
              This tool is restricted to adults 18 and older. If you're under 18, try
              the <Link href="/quiz/">Atheism IQ Quiz</Link> instead.
            </p>
            <h2>How it works</h2>
            <p>
              After signing up, you get a few free messages to start a debate. Beyond that,
              conversations are metered by credits. Each exchange costs credits based on the
              complexity and length of the response. You can purchase more credits as needed,
              or use the free messages to explore the agent's reasoning style first.
            </p>
            <h2>Get started</h2>
            <p>Ready to test your ideas?</p>
            <p style={{ textAlign: "center", marginTop: "2rem" }}>
              <Link
                href="/chat/"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  background: "var(--accent)",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "0.25rem",
                  fontWeight: 500,
                }}
              >
                Start a debate
              </Link>
            </p>
            <p style={{ textAlign: "center", marginTop: "1rem" }}>
              Or take a step back and measure your knowledge:
            </p>
            <p style={{ textAlign: "center" }}>
              <Link href="/quiz/">Take the Atheism IQ Quiz</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
