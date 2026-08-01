// The site's two fixed inline <script> bootstraps, extracted so middleware.ts
// can hash the EXACT strings the root layout renders. On dynamic app pages the
// CSP is nonce-based (no 'unsafe-inline'), and these inline scripts are
// allowed by sha256 hash instead — which only works while middleware and
// layout share one copy of the text. Never fork these strings.

// Runs before paint: apply the saved theme/font (or the OS preference) so
// there's no flash of the wrong theme and no hydration mismatch. Same
// localStorage keys (`aa-theme` / `aa-font`) and `data-*` attributes the
// publication has always used.
export const themeScript = `(function(){try{var t=localStorage.getItem('aa-theme');var f=localStorage.getItem('aa-font');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-font',f||'md');}catch(e){}})();`;

// GA4 dataLayer stub. Queues events until the afterInteractive gtag loader
// arrives (see app/layout.tsx), so deferring the loader loses nothing.
export function gtagStub(gaId: string): string {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
}
