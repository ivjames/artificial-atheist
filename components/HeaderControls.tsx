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

  return (
    <div className="controls">
      <div
        className="ctrl ctrl-font-sm"
        role="button"
        tabIndex={0}
        aria-label="Smaller text"
        aria-pressed={mounted && font === "sm"}
        onClick={() => setFont("sm")}
        onKeyDown={(e) => e.key === "Enter" && setFont("sm")}
      >
        A
      </div>
      <div
        className="ctrl ctrl-font-lg"
        role="button"
        tabIndex={0}
        aria-label="Larger text"
        aria-pressed={mounted && font === "lg"}
        onClick={() => setFont("lg")}
        onKeyDown={(e) => e.key === "Enter" && setFont("lg")}
      >
        A
      </div>
      <div className="ctrl-sep" />
      <div
        className="ctrl ctrl-icon"
        role="button"
        tabIndex={0}
        aria-label="Toggle light or dark mode"
        onClick={toggleTheme}
        onKeyDown={(e) => e.key === "Enter" && toggleTheme()}
      >
        <i className={`ti ${mounted && theme === "dark" ? "ti-sun" : "ti-moon"}`} />
      </div>
      <a className="ctrl ctrl-icon" href="/search/" aria-label="Search">
        <i className="ti ti-search" />
      </a>
    </div>
  );
}
