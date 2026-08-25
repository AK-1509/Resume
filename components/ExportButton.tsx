"use client";

import { requestExport } from "@/lib/export-event";

export function ExportButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={requestExport}
      className={
        className ??
        "shrink-0 rounded-[2px] bg-claret px-6 py-3 font-sans text-ui font-medium text-white transition-colors hover:bg-claret-dim"
      }
    >
      Export resume
    </button>
  );
}
