"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import type { GalleryItem } from "@/lib/schema";

/**
 * Full-screen gallery viewer.
 *
 * Built on a native <dialog> opened with showModal(), which supplies the focus
 * trap, the inert background, ESC-to-close, and focus return to the element
 * that opened it. Because it is a second modal dialog stacked on the detail
 * modal, ESC closes this one first and the modal second — the required
 * ordering, for free, rather than through a hand-rolled key stack.
 *
 * This is the only place in the app where images render in full colour. In the
 * page they are duotoned into the palette; opening one is the reveal.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const open = index !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (items.length === 0) return null;

  const current = index === null ? null : items[index];

  return (
    <dialog
      ref={ref}
      aria-label="Gallery"
      onClose={(event) => {
        // The DOM `close` event does not bubble, but React dispatches it
        // through the React tree — and this dialog is rendered inside the
        // detail modal's. Without this, one Escape would close both instead of
        // the lightbox first and the modal second.
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        // The backdrop is part of the dialog box, so a click landing on the
        // element itself rather than its content is a click outside.
        if (event.target === ref.current) onClose();
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
      className="on-ink m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/95"
    >
      {current && (
        <div className="flex h-full w-full flex-col bg-ink/95">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <p className="metadata text-brass" aria-live="polite">
              {(index ?? 0) + 1} / {items.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[2px] border border-brass/60 px-3 py-2 font-sans text-ui font-medium text-paper transition-colors hover:border-brass"
            >
              Close
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="absolute start-4 z-10 rounded-full border border-brass/60 bg-ink/80 p-3 text-paper transition-colors hover:border-brass"
              >
                <Chevron direction="start" />
              </button>
            )}

            {/* Full colour: no `plate` class here. */}
            <Image
              key={current.id}
              src={current.src}
              alt={current.alt}
              width={1600}
              height={1200}
              className="max-h-full w-auto max-w-full object-contain"
              priority
            />

            {items.length > 1 && (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next image"
                className="absolute end-4 z-10 rounded-full border border-brass/60 bg-ink/80 p-3 text-paper transition-colors hover:border-brass"
              >
                <Chevron direction="end" />
              </button>
            )}
          </div>

          <div className="min-h-[4.5rem] px-5 py-5">
            {/* caption is optional — the block keeps its height so navigating
                between a captioned and an uncaptioned image doesn't jump. */}
            {current.caption && (
              <p className="mx-auto max-w-[65ch] text-center font-sans text-body text-paper/85">
                {current.caption}
              </p>
            )}
          </div>

          {/* Preload the neighbours so arrowing through is instant. */}
          <div className="sr-only" aria-hidden="true">
            {[-1, 1].map((delta) => {
              const neighbour = items[((index ?? 0) + delta + items.length) % items.length];
              return neighbour && neighbour.id !== current.id ? (
                <Image
                  key={neighbour.id}
                  src={neighbour.src}
                  alt=""
                  width={1600}
                  height={1200}
                />
              ) : null;
            })}
          </div>
        </div>
      )}
    </dialog>
  );
}

function Chevron({ direction }: { direction: "start" | "end" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none">
      <path
        d={direction === "start" ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
