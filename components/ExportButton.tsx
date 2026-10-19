"use client";

import { requestExport } from "@/lib/export-event";

/**
 * `compact` shortens the visible label to "Export" below 640px, where the
 * header has no room for both words. The accessible name stays "Export
 * resume", which still begins with the visible word.
 */
export function ExportButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={requestExport}
      aria-label={compact ? "Export resume" : undefined}
      className={
        className ??
        "shrink-0 rounded-[2px] bg-claret px-6 py-3 font-sans text-ui font-medium text-white transition-colors hover:bg-claret-dim"
      }
    >
      {compact ? (
        <>
          <span className="sm:hidden">Export</span>
          <span className="hidden sm:inline">Export resume</span>
        </>
      ) : (
        "Export resume"
      )}
    </button>
  );
}
