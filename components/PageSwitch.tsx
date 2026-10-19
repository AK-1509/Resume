"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { RolePage } from "@/lib/portfolio";

/** Pointer travel before a press on the rail counts as a drag, not a click. */
const DRAG_START = 5;

export type SwitchOption = { page: RolePage; label: string; count: number; panelId: string };

/**
 * The gold switch between a role's two pages.
 *
 * It is a two-tab tablist: click either side, or use the arrow keys, Home and
 * End. On top of that the gold handle can be dragged — the pages slide along
 * with it, live, and settle on whichever side the handle is released nearer
 * to. The handle's position is the pager's scroll progress, so a swipe on the
 * pages moves it too.
 */
export function PageSwitch({
  id,
  options,
  selected,
  progress,
  onSelect,
  onDrag,
  onDragEnd,
}: {
  id: string;
  options: [SwitchOption, SwitchOption];
  selected: RolePage;
  /** 0 = first page in view, 1 = second; anything between while moving. */
  progress: number;
  onSelect: (page: RolePage) => void;
  onDrag: (progress: number) => void;
  onDragEnd: (progress: number) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const press = useRef<{ x: number; start: number; half: number; pointer: number; moved: boolean; last: number } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  const focusAndSelect = (i: number) => {
    tabRefs.current[i]?.focus();
    onSelect(options[i].page);
  };

  return (
    <div className="pf-switch">
      <div
        ref={railRef}
        role="tablist"
        aria-label="Choose a page"
        className={`pf-switch__rail${dragging ? " is-dragging" : ""}`}
        style={{ "--p": progress } as CSSProperties}
        onKeyDown={(ev) => {
          const current = options.findIndex((o) => o.page === selected);
          let next = -1;
          if (ev.key === "ArrowRight") next = Math.min(current + 1, 1);
          else if (ev.key === "ArrowLeft") next = Math.max(current - 1, 0);
          else if (ev.key === "Home") next = 0;
          else if (ev.key === "End") next = 1;
          if (next === -1) return;
          ev.preventDefault();
          focusAndSelect(next);
        }}
        onPointerDown={(ev) => {
          if (ev.button !== 0) return;
          // A drag's release is captured by the rail, so its click may never
          // reach a tab to clear the flag; a fresh press always does.
          suppressClick.current = false;
          const rail = railRef.current;
          if (!rail) return;
          press.current = {
            x: ev.clientX,
            start: progress,
            half: rail.getBoundingClientRect().width / 2,
            pointer: ev.pointerId,
            moved: false,
            last: progress,
          };
        }}
        onPointerMove={(ev) => {
          const p = press.current;
          if (!p || ev.pointerId !== p.pointer) return;
          const dx = ev.clientX - p.x;
          if (!p.moved) {
            if (Math.abs(dx) < DRAG_START) return;
            p.moved = true;
            railRef.current?.setPointerCapture(p.pointer);
            setDragging(true);
          }
          p.last = Math.min(1, Math.max(0, p.start + dx / p.half));
          onDrag(p.last);
        }}
        onPointerUp={(ev) => {
          const p = press.current;
          press.current = null;
          if (!p || ev.pointerId !== p.pointer || !p.moved) return;
          // The release would otherwise land as a click on whichever tab is
          // under the pointer and override where the handle was dropped.
          suppressClick.current = true;
          setDragging(false);
          onDragEnd(p.last);
        }}
        onPointerCancel={() => {
          const p = press.current;
          press.current = null;
          if (p?.moved) {
            setDragging(false);
            onDragEnd(p.last);
          }
        }}
      >
        <span className="pf-switch__thumb" aria-hidden="true">
          <span className="pf-switch__grip" />
        </span>
        {options.map((option, i) => {
          const isSelected = option.page === selected;
          return (
            <button
              key={option.page}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${option.page}`}
              aria-selected={isSelected}
              aria-controls={option.panelId}
              tabIndex={isSelected ? 0 : -1}
              className="pf-switch__tab"
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onSelect(option.page);
              }}
            >
              <span>{option.label}</span>
              <span className="pf-switch__count">{option.count}</span>
            </button>
          );
        })}
      </div>
      <p className="druid-caption pf-switch__hint" aria-hidden="true">
        Drag the gold handle, tap a side, or swipe the pages sideways.
      </p>
    </div>
  );
}
