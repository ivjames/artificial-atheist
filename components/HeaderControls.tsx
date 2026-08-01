"use client";

import { useEffect, useState } from "react";

// Reader controls ported from artificial-atheist/src/js/app.js: a font-size
// stepper (sm/md/lg, persisted as `aa-font`) and a light/dark toggle
// (persisted as `aa-theme`). Both write the corresponding `data-*` attribute
// onto <html> so app/globals.css's ported AA tokens pick them up immediately.
type Theme = "light" | "dark";
type FontSize = "sm" | "md" | "lg";

export default function HeaderControls() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [font, setFontState] = useState<FontSize>("md");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setThemeState((root.getAttribute("data-theme") as Theme) || "light");
    setFontState((root.getAttribute("data-font") as FontSize) || "md");
    setMounted(true);
  }, []);

  const setTheme = (next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("aa-theme", next);
    } catch {
      /* ignore */
    }
    setThemeState(next);
  };

  const setFont = (next: FontSize) => {
    document.documentElement.setAttribute("data-font", next);
    try {
      localStorage.setItem("aa-font", next);
    } catch {
      /* ignore */
    }
    setFontState(next);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // Native <button>s: focusable and Enter/Space-operable without the tabindex
  // + keydown plumbing a div[role=button] needs (QA flagged the divs as not
  // reliably keyboard operable). The theme toggle reports aria-pressed (dark =
  // pressed); .ctrl-theme in globals.css keeps it from picking up the
  // font-stepper's pressed accent styling.
  return (
    <div className="controls">
      <button
        type="button"
        className="ctrl ctrl-font-sm"
        aria-label="Smaller text"
        aria-pressed={mounted && font === "sm"}
        onClick={() => setFont("sm")}
      >
        A
      </button>
      <button
        type="button"
        className="ctrl ctrl-font-lg"
        aria-label="Larger text"
        aria-pressed={mounted && font === "lg"}
        onClick={() => setFont("lg")}
      >
        A
      </button>
      <div className="ctrl-sep" />
      <button
        type="button"
        className="ctrl ctrl-icon ctrl-theme"
        aria-label="Toggle light or dark mode"
        aria-pressed={mounted && theme === "dark"}
        onClick={toggleTheme}
      >
        <i
          aria-hidden="true"
          className={`ti ${mounted && theme === "dark" ? "ti-sun" : "ti-moon"}`}
        />
      </button>
      <a className="ctrl ctrl-icon" href="/search/" aria-label="Search">
        <i aria-hidden="true" className="ti ti-search" />
      </a>
    </div>
  );
}
