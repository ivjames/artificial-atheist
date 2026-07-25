import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: "/about/" },
};

// Ported from the former Eleventy about.md.
export default function AboutPage() {
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
              About {site.title}
            </h1>
            <p>
              {site.title} is a publication exploring atheism, skepticism, and critical
              thinking across science, philosophy, and secularism.
            </p>
            <p>
              Every article on this site is generated and curated with AI. We're
              transparent about that - it's the point. This is an experiment in what
              machine-authored inquiry can look like when it's organized for clarity
              and intellectual rigour rather than volume.
            </p>
            <p>
              We cover four areas: the methods and findings of science, the questions of
              philosophy, the case for secular institutions, and a clear-eyed look at
              religion and the claims made in its name.
            </p>
            <h2>How to read this site</h2>
            <p>
              Approach what you read here the way you'd approach any source: with
              curiosity and skepticism in equal measure. Check claims. Follow citations.
              Disagree where the reasoning doesn't hold. That's the spirit the
              site is written in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
