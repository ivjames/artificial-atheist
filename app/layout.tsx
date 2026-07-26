import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import "./globals.css";
import "./publication.css";
import HeaderControls from "@/components/HeaderControls";
import AccountMenu from "@/components/AccountMenu";
import { CHAT_ENABLED, SITE_URL } from "@/lib/config";
import { site, nav } from "@/lib/site";
import { getAllPosts } from "@/lib/posts";

// Runs before paint: apply the saved theme/font (or the OS preference) so
// there's no flash of the wrong theme and no hydration mismatch. Same
// localStorage keys (`aa-theme` / `aa-font`) and `data-*` attributes the
// publication has always used.
const themeScript = `(function(){try{var t=localStorage.getItem('aa-theme');var f=localStorage.getItem('aa-font');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-font',f||'md');}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.title} — ${site.description}`,
    template: `%s — ${site.title}`,
  },
  description: site.description,
  alternates: {
    canonical: "/",
    types: { "application/atom+xml": "/feed.xml" },
  },
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
    siteName: site.title,
    url: SITE_URL,
  },
  twitter: { card: "summary" },
  icons: { icon: "/favicon.svg" },
};

// Artificial Atheist logo mark. Colors come from the --mark-* tokens so it
// reads correctly in both themes.
function LogoMark() {
  return (
    <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="aa-lens">
          <path d="M36 16C41 21.5 43.5 28.5 43.5 36S41 50.5 36 56C31 50.5 28.5 43 28.5 36S31 21.5 36 16Z" />
        </clipPath>
      </defs>
      <circle cx="27" cy="36" r="20" fill="none" stroke="var(--mark-stroke)" strokeWidth="1.75" />
      <circle cx="45" cy="36" r="20" fill="none" stroke="var(--mark-stroke)" strokeWidth="1.75" />
      <path
        d="M36 16C41 21.5 43.5 28.5 43.5 36S41 50.5 36 56C31 50.5 28.5 43 28.5 36S31 21.5 36 16Z"
        fill="var(--mark-overlay)"
      />
      <text
        x="36"
        y="44"
        textAnchor="middle"
        fontFamily="Oxanium"
        fontSize="26"
        fontWeight="700"
        fill="var(--mark-letter)"
        clipPath="url(#aa-lens)"
      >
        a
      </text>
    </svg>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Debate item (→ /chat) is hidden until the chat surface is live.
  const menu = nav.filter((item) => CHAT_ENABLED || !item.url.startsWith("/chat"));
  const latest = getAllPosts().slice(0, 4);

  return (
    <html lang="en" data-theme="light" data-font="md" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {site.analytics.gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${site.analytics.gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.analytics.gaId}');`,
              }}
            />
          </>
        )}
        <header>
          <div className="mast">
            <Link className="brand" href="/" aria-label={`${site.title} home`}>
              <LogoMark />
              <span>
                <span className="brand-name">{site.title}</span>
                <span className="brand-sub">{site.tagline}</span>
              </span>
            </Link>
            <HeaderControls />
          </div>
          <nav className="subnav" aria-label="Topics">
            <div className="subnav-inner">
              {menu.map((item) => (
                <Fragment key={item.label}>
                  {item.label === "News" && (
                    <span className="subnav-break" aria-hidden="true" />
                  )}
                  <a href={item.url}>
                    <i className={`ti ${item.icon}`} /> {item.label}
                  </a>
                </Fragment>
              ))}
            </div>
          </nav>
          {latest.length > 0 && (
            <div className="ticker">
              <div className="ticker-inner">
                <span className="ticker-label">Latest</span>
                <div className="ticker-items">
                  {latest.map((post) => (
                    <a className="ticker-item" key={post.slug} href={post.url}>
                      <span className="dot">●</span> {post.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </header>

        <main>{children}</main>

        <footer className="footer">
          <AccountMenu chatEnabled={CHAT_ENABLED} />
          <div className="footer-inner">
            <div className="footer-left">
              <span className="footer-name">{site.title}</span>
              <span className="ai-badge">
                <i className="ti ti-robot" /> AI-generated
              </span>
            </div>
            <div className="footer-links">
              <a href="/about/">About</a>
              <a href="/faq/">FAQ</a>
              <a href={site.social.facebook}>Facebook</a>
              <a href="/feed.xml">RSS</a>
              {site.donate.enabled && (
                <a href={site.donate.url} target="_blank" rel="noopener">
                  {site.donate.label}
                </a>
              )}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
