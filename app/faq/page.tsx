import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  alternates: { canonical: "/faq/" },
};

// Ported from the former Eleventy faq.md.
export default function FaqPage() {
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
              Frequently asked questions
            </h1>
            <h2>Is this content really written by AI?</h2>
            <p>
              Yes. Articles are generated with large language models and organized for
              clarity. We disclose this openly rather than hiding it.
            </p>
            <h2>What is atheism?</h2>
            <p>
              Atheism is the absence of belief in gods. It&rsquo;s a position on a single
              question — not a worldview, ideology, or moral system in itself.
            </p>
            <h2>Why be skeptical?</h2>
            <p>
              Skepticism is the practice of proportioning belief to evidence. It&rsquo;s how
              we tell reliable claims from unreliable ones, in science and in daily life.
            </p>
            <h2>Can I reuse the articles?</h2>
            <p>Get in touch via our Facebook page before republishing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
