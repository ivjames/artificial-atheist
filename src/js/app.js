// Reader preferences: theme (light/dark) + font size (sm/md/lg).
// Persisted to localStorage. The no-flash init runs inline in <head>;
// this file wires up the buttons after the DOM is ready.

(function () {
  const root = document.documentElement;

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("aa-theme", theme); } catch (e) {}
    const btn = document.querySelector("[data-toggle-theme] i");
    if (btn) btn.className = theme === "dark" ? "ti ti-sun" : "ti ti-moon";
  }

  function setFont(size) {
    root.setAttribute("data-font", size);
    try { localStorage.setItem("aa-font", size); } catch (e) {}
    document.querySelectorAll("[data-set-font]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-font") === size ? "true" : "false");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Reflect current state on the controls.
    setTheme(root.getAttribute("data-theme") || "light");
    setFont(root.getAttribute("data-font") || "md");

    const themeBtn = document.querySelector("[data-toggle-theme]");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        setTheme(next);
      });
    }

    document.querySelectorAll("[data-set-font]").forEach((b) => {
      b.addEventListener("click", () => setFont(b.getAttribute("data-set-font")));
    });
  });
})();
