"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/**
 * Light/dark switch.
 *
 * `role="switch"` rather than a button, so assistive tech announces the state
 * rather than just the label. The icon and the word both carry the state, so
 * it never depends on colour alone.
 *
 * The applied theme lives on <html data-theme>, set by the inline script in
 * app/layout.tsx before first paint. That element is the source of truth, not
 * React — so this subscribes to it rather than mirroring it into state, which
 * keeps the two from drifting apart.
 */
const THEME_EVENT = "themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** The server cannot know the visitor's preference; the inline script corrects
 *  the DOM before paint and this store re-reads it after hydration. */
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = theme === "dark";

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private-mode storage failures shouldn't break the toggle for this view.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  // A Druid quiet button. The visible word names the mode the switch turns
  // on, and the icon beside it shows the mode in force, so the state never
  // rests on colour alone.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={toggle}
      className="druid-button druid-button--quiet shrink-0 px-3.5"
    >
      {dark ? <MoonIcon /> : <SunIcon />}
      {/* The word yields below 640px; the icon still shows the mode. */}
      <span aria-hidden="true" className="max-sm:hidden">
        {dark ? "Dark" : "Light"}
      </span>
    </button>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${className}`} aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1" />
      </g>
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${className}`} aria-hidden="true">
      <path d="M13.2 9.8A5.8 5.8 0 0 1 6.2 2.8a5.9 5.9 0 1 0 7 7Z" fill="currentColor" />
    </svg>
  );
}
