"use client";

import { useEffect, useState } from "react";

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Sync with whatever the server rendered (cookie-based) on mount. This is
  // the standard SSR-safe hydration pattern for a theme toggle: render the
  // server's value first, then read the real DOM state once mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setTheme(readTheme()), []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  return (
    <button
      onClick={toggle}
      className={`control-focus toggle-switch flex items-center ${theme === "dark" ? "on" : ""}`}
      aria-pressed={theme === "dark"}
      aria-label="สลับโหมดมืด/สว่าง"
      title="Dark mode"
    >
      <span className="knob" />
    </button>
  );
}
