"use client";

import { useId, useRef, useState } from "react";

/**
 * The pain points: a row of chips that work as tabs, with the chosen one's
 * detail underneath. The chosen chip is filled gold and its mark is filled
 * in, so the choice shows without relying on colour.
 *
 * Arrow keys move along the row, Home and End jump to its ends. A change made
 * from the keyboard swaps the text at once; a pointer's choice crossfades.
 */
export function PainPoints({ items }: { items: { label: string; detail: string }[] }) {
  const [chosen, setChosen] = useState({ index: 0, byKey: false });
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const tabId = (i: number) => `${base}-tab-${i}`;
  const panelId = `${base}-panel`;

  const moveTo = (i: number) => {
    const next = (i + items.length) % items.length;
    setChosen({ index: next, byKey: true });
    tabs.current[next]?.focus();
  };

  if (items.length === 0) return null;
  const current = Math.min(chosen.index, items.length - 1);

  return (
    <div>
      <div
        className="cs-chips"
        role="tablist"
        aria-label="Pain points"
        onKeyDown={(ev) => {
          if (ev.key === "ArrowRight") moveTo(current + 1);
          else if (ev.key === "ArrowLeft") moveTo(current - 1);
          else if (ev.key === "Home") moveTo(0);
          else if (ev.key === "End") moveTo(items.length - 1);
          else return;
          ev.preventDefault();
        }}
      >
        {items.map((item, i) => (
          <button
            key={item.label}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            className="cs-chip"
            aria-selected={i === current}
            aria-controls={panelId}
            tabIndex={i === current ? 0 : -1}
            onClick={() => setChosen({ index: i, byKey: false })}
          >
            <span className="cs-chip__mark" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="cs-pain"
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(current)}
        tabIndex={0}
        data-swap={chosen.byKey ? "instant" : "soft"}
      >
        {/* Keyed so the crossfade runs again for each new choice. */}
        <p key={current}>{items[current].detail}</p>
      </div>
    </div>
  );
}
