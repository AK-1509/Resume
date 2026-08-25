"use client";

import { forwardRef } from "react";
import {
  CONTENT_WIDTH_PX,
  PAGE,
  PT_TO_PX,
  SCALE,
  type Density,
  type PrintModel,
} from "@/lib/export";
import { formatDuration } from "@/lib/format";

/**
 * The print page, in HTML.
 *
 * Rendered twice: once into an off-screen node at exact page geometry so the
 * fit can be measured, and once visibly (scaled down) as the preview. The PDF
 * mirrors this layout using the same metrics from lib/export.ts.
 *
 * Deliberately plain — black on white, no palette. A resume PDF is read by
 * people and parsed by software, and neither benefits from the cream.
 */
export const PrintLayout = forwardRef<
  HTMLDivElement,
  { model: PrintModel; density: Density; measuring?: boolean }
>(function PrintLayout({ model, density, measuring = false }, ref) {
  const px = (pt: number) => `${pt * PT_TO_PX}px`;
  const body = density.bodyPt;

  return (
    <div
      ref={ref}
      style={{
        width: `${CONTENT_WIDTH_PX}px`,
        // When measuring, the node must be free to grow past a page so the
        // overflow can be read off scrollHeight.
        ...(measuring ? {} : { minHeight: `${PAGE.heightPx - PAGE.marginPx * 2}px` }),
        fontFamily: "var(--font-plex-sans), sans-serif",
        fontSize: px(body),
        lineHeight: density.leading,
        color: "#000",
        background: "#fff",
      }}
    >
      {/* Header: name, then contact on one line. */}
      <header>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: px(body * SCALE.name),
            fontWeight: 600,
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {model.profile.name}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-plex-mono), monospace",
            fontSize: px(body * SCALE.meta),
            margin: `${px(density.sectionGapPt * 0.3)} 0 0`,
          }}
        >
          {[
            model.profile.email,
            model.profile.location,
            ...model.profile.links.map((l) => l.url.replace(/^https?:\/\/(www\.)?/, "")),
          ].join("  ·  ")}
        </p>
        <div style={{ borderTop: "1px solid #000", marginTop: px(density.sectionGapPt * 0.45) }} />
      </header>

      {model.groups.map((group) => (
        <section key={group.heading} style={{ marginTop: px(density.sectionGapPt) }}>
          <h2
            style={{
              fontFamily: "var(--font-plex-mono), monospace",
              fontSize: px(body * SCALE.meta),
              fontWeight: 400,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: `0 0 ${px(density.sectionGapPt * 0.4)}`,
            }}
          >
            {group.heading}
          </h2>

          {group.entries.map((entry, i) => (
            <article
              key={entry.id}
              style={{
                marginTop: i === 0 ? 0 : px(density.sectionGapPt * 0.55),
                // Keeps a heading from being orphaned at the foot of the page
                // and a single bullet from being stranded from its entry.
                breakInside: "avoid",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1em" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: px(body * SCALE.entryTitle) }}>
                  {entry.title}
                  {entry.organization && (
                    <span style={{ fontWeight: 400 }}>{`, ${entry.organization}`}</span>
                  )}
                </p>
                <p
                  style={{
                    margin: 0,
                    flexShrink: 0,
                    fontFamily: "var(--font-plex-mono), monospace",
                    fontSize: px(body * SCALE.meta),
                  }}
                >
                  {formatDuration(entry.startDate, entry.endDate)}
                  {entry.location ? `  ·  ${entry.location}` : ""}
                </p>
              </div>

              {entry.responsibilities.length > 0 && (
                <ul
                  style={{
                    margin: `${px(density.sectionGapPt * 0.25)} 0 0`,
                    paddingInlineStart: "1.1em",
                    // Tailwind's preflight strips list markers globally; the
                    // PDF draws its own bullets, so restore them here or the
                    // preview lies about what the file will look like.
                    listStyleType: "disc",
                  }}
                >
                  {entry.responsibilities.map((item) => (
                    <li key={item} style={{ breakInside: "avoid" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      ))}

      {model.skills.length > 0 && (
        <section style={{ marginTop: px(density.sectionGapPt) }}>
          <p style={{ margin: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-plex-mono), monospace",
                fontSize: px(body * SCALE.meta),
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Skills{"  "}
            </span>
            {model.skills.map((s) => s.label).join("  ·  ")}
          </p>
        </section>
      )}

      {model.languages.length > 0 && (
        <section style={{ marginTop: px(density.sectionGapPt * 0.45) }}>
          <p style={{ margin: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-plex-mono), monospace",
                fontSize: px(body * SCALE.meta),
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Languages{"  "}
            </span>
            {model.languages.join("  ·  ")}
          </p>
        </section>
      )}
    </div>
  );
});
