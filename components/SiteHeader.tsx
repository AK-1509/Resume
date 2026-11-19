"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { ExportButton } from "./ExportButton";

/**
 * The glass header. It sits on a zero-height sticky rail, so the hero runs
 * underneath it and every section scrolls behind the frosted bar.
 *
 * On a project page ("case") the links lead back to the portfolio rather than
 * around it, and there is no export button: the export dialog lives on the
 * portfolio page only.
 *
 * On a phone the bar is one row: the name, the actions and a menu button that
 * opens the links underneath. The links are the same `<nav>` at every width;
 * the button only shows below 640px, and closes the menu again on a link,
 * Escape, or a tap outside the bar.
 */
export function SiteHeader({
  name,
  variant = "home",
  caseStudies = true,
}: {
  name: string;
  variant?: "home" | "case";
  /** Whether the portfolio has a case-studies section to link to. */
  caseStudies?: boolean;
}) {
  const home = variant === "home";
  const [open, setOpen] = useState(false);
  const navId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (ev: PointerEvent) => {
      if (!barRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <>
      <a className="druid-skip druid-button" href={home ? "#roles" : "#case"}>
        {home ? "Skip to the roles" : "Skip to the project"}
      </a>
      <div className="pf-header-wrap">
        <header className="pf-header">
          <div className="druid-container">
            <div
              ref={barRef}
              className="pf-glass"
              onKeyDown={(ev) => {
                if (ev.key === "Escape" && open) {
                  setOpen(false);
                  buttonRef.current?.focus();
                }
              }}
            >
              {home ? (
                <a className="pf-brand" href="#top">
                  {name}
                </a>
              ) : (
                <Link className="pf-brand" href="/">
                  {name}
                </Link>
              )}
              <nav
                id={navId}
                className="pf-nav"
                aria-label="Site"
                data-open={open}
                onClick={(ev) => {
                  if ((ev.target as HTMLElement).closest("a")) setOpen(false);
                }}
              >
                {home ? (
                  <>
                    <a href="#roles">Roles</a>
                    {caseStudies && <a href="#case-studies">Case studies</a>}
                    <a href="#contact">Contact</a>
                  </>
                ) : (
                  <>
                    <Link href="/#roles">Roles</Link>
                    <Link href="/#case-studies">Case studies</Link>
                    <Link href="/#contact">Contact</Link>
                  </>
                )}
              </nav>
              <div className="pf-actions">
                <ThemeToggle />
                {home && <ExportButton className="druid-button shrink-0 max-sm:px-3.5" compact />}
                <button
                  ref={buttonRef}
                  type="button"
                  className="druid-button druid-button--quiet pf-menu-btn"
                  aria-expanded={open}
                  aria-controls={navId}
                  aria-label="Menu"
                  onClick={() => setOpen((o) => !o)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
