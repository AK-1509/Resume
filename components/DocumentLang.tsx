"use client";

import { useEffect } from "react";

/**
 * Keeps `<html lang>` in step with the page's language.
 *
 * The root layout is shared by every route and renders `lang="en"`. The page
 * root already carries its own `lang`, which is what assistive tech and the
 * browser's hyphenation read inside it, so this only matters for what sits
 * outside it (the export dialog) and for tools that read the document's
 * language. It also covers the switch itself, which is a client navigation
 * and never reloads the document.
 */
export function DocumentLang({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const before = root.lang;
    root.lang = lang;
    // Leaving for a page that is not translated (a project page) restores
    // the layout's language rather than keeping this one.
    return () => {
      root.lang = before;
    };
  }, [lang]);
  return null;
}
