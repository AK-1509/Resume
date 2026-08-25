"use client";

import { useEffect, useRef, useState } from "react";
import {
  DENSITY_LADDER,
  PAGE,
  buildPrintModel,
  type ExportSelection,
} from "@/lib/export";
import type { Experience, Profile, Skill } from "@/lib/schema";
import { PrintLayout } from "./PrintLayout";
import { SelectPane } from "./SelectPane";
import { OrderPane } from "./OrderPane";
import { useAutoFit } from "./useAutoFit";
import { pdfFilename, registerPdfFonts, ResumePdf } from "./ResumePdf";

type Pane = "select" | "order" | "preview";

const PANES: { id: Pane; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "order", label: "Order" },
  { id: "preview", label: "Preview" },
];

export function ExportDialog({
  open,
  onClose,
  profile,
  experiences,
  skills,
  languages,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  experiences: Experience[];
  skills: Skill[];
  languages: string[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pane, setPane] = useState<Pane>("select");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Everything is selected by default; the export starts as the whole resume
  // and the user subtracts from it.
  const [selection, setSelection] = useState<ExportSelection>(() => ({
    order: experiences.map((e) => e.id),
    skillIds: skills.map((s) => s.id),
    includeLanguages: languages.length > 0,
  }));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const model = buildPrintModel(profile, experiences, skills, languages, selection);
  const { measureRef, measuringDensity, result } = useAutoFit(model, open);

  const selectedEntries = selection.order
    .map((id) => experiences.find((e) => e.id === id))
    .filter((e): e is Experience => Boolean(e));

  function toggleExperience(id: string, next: boolean) {
    setSelection((s) => ({
      ...s,
      order: next
        ? // Restore into the resume's own order rather than appending, so
          // re-checking something doesn't send it to the bottom.
          experiences.filter((e) => e.id === id || s.order.includes(e.id)).map((e) => e.id)
        : s.order.filter((x) => x !== id),
    }));
  }

  function toggleSkill(id: string, next: boolean) {
    setSelection((s) => ({
      ...s,
      skillIds: next
        ? skills.filter((k) => k.id === id || s.skillIds.includes(k.id)).map((k) => k.id)
        : s.skillIds.filter((x) => x !== id),
    }));
  }

  async function download() {
    if (!result?.fits || busy) return;
    setBusy(true);
    setStatus("Building the PDF…");
    try {
      registerPdfFonts();
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<ResumePdf model={model} density={result.density} />).toBlob();

      // The preview is measured in the DOM; the PDF is laid out by a different
      // engine. Verify rather than assume they agreed.
      const pages = await countPages(blob);
      if (pages > 1) {
        setStatus(
          `The PDF came out ${pages} pages even though the preview fitted. Deselect an experience and try again.`,
        );
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFilename(profile.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("Downloaded.");
    } catch (error) {
      setStatus(
        `The PDF could not be built: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  const previewScale = 0.62;

  return (
    <>
    <dialog
      ref={ref}
      aria-labelledby="export-title"
      onClose={(event) => {
        if (event.target !== ref.current) return;
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(60rem,calc(100vw-2rem))] max-w-none rounded-[2px] bg-surface p-0 text-strong backdrop:bg-ink/70"
    >
      <div className="flex max-h-[min(88vh,54rem)] flex-col">
        <div className="flex items-start justify-between gap-6 border-b border-rule p-6 pb-4 sm:px-8">
          <div>
            <h2 id="export-title" className="font-serif text-section font-medium">
              Export resume
            </h2>
            <p className="mt-1 font-sans text-ui text-soft">
              Choose what goes on the page, set the order, then download a one-page PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-[2px] border border-rule p-2 transition-colors hover:border-accent"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path
                d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Panes */}
        <div className="border-b border-rule px-6 sm:px-8" role="tablist" aria-label="Export steps">
          <div className="flex gap-1">
            {PANES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pane === p.id}
                aria-controls={`pane-${p.id}`}
                id={`tab-${p.id}`}
                onClick={() => setPane(p.id)}
                className={`-mb-px border-b-2 px-4 py-3 font-sans text-ui font-medium transition-colors ${
                  pane === p.id
                    ? "border-accent text-strong"
                    : "border-transparent text-soft hover:text-strong"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div
          key={pane}
          id={`pane-${pane}`}
          role="tabpanel"
          aria-labelledby={`tab-${pane}`}
          tabIndex={0}
          // Keyed by pane so switching tabs starts at the top of the new one
          // rather than inheriting the previous pane's scroll position, which
          // would bury the fit report on arrival.
          className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8"
        >
          {pane === "select" && (
            <SelectPane
              experiences={experiences}
              skills={skills}
              selectedIds={selection.order}
              selectedSkillIds={selection.skillIds}
              includeLanguages={selection.includeLanguages}
              hasLanguages={languages.length > 0}
              onToggleExperience={toggleExperience}
              onToggleSkill={toggleSkill}
              onToggleLanguages={(next) =>
                setSelection((s) => ({ ...s, includeLanguages: next }))
              }
            />
          )}

          {pane === "order" && (
            <OrderPane
              entries={selectedEntries}
              onReorder={(ids) => setSelection((s) => ({ ...s, order: ids }))}
            />
          )}

          {pane === "preview" && (
            <div className="flex flex-col items-center gap-6">
              <FitReport result={result} />
              <div
                className="overflow-hidden border border-rule bg-white"
                style={{
                  width: PAGE.widthPx * previewScale,
                  height: PAGE.heightPx * previewScale,
                }}
              >
                <div
                  style={{
                    width: PAGE.widthPx,
                    height: PAGE.heightPx,
                    padding: PAGE.marginPx,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  {result && <PrintLayout model={model} density={result.density} />}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule p-6 sm:px-8">
          <p aria-live="polite" className="font-sans text-ui text-soft">
            {status ??
              (result
                ? result.fits
                  ? `Fits on one page at size ${result.density.bodyPt}pt.`
                  : "Does not fit on one page."
                : "Measuring…")}
          </p>
          <div className="flex gap-3">
            {pane !== "preview" && (
              <button
                type="button"
                onClick={() => setPane(pane === "select" ? "order" : "preview")}
                className="rounded-[2px] border border-rule px-5 py-3 font-sans text-ui font-medium transition-colors hover:border-accent"
              >
                Next
              </button>
            )}
            <button
              type="button"
              onClick={download}
              disabled={!result?.fits || busy}
              className="rounded-[2px] bg-claret px-5 py-3 font-sans text-ui font-medium text-white transition-colors hover:bg-claret-dim disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Building…" : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

    </dialog>

      {/* Off-screen measurement node at exact page geometry.
          Deliberately a sibling of the dialog, not a child: a closed <dialog>
          is display:none, and a node inside one reports scrollHeight 0 — which
          would read as "everything fits" rather than "nothing was measured".
          `visibility: hidden` keeps it laid out; `display: none` would not. */}
      {open && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: PAGE.widthPx,
            padding: PAGE.marginPx,
            visibility: "hidden",
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <PrintLayout ref={measureRef} model={model} density={measuringDensity} measuring />
        </div>
      )}
    </>
  );
}

function FitReport({ result }: { result: ReturnType<typeof useAutoFit>["result"] }) {
  if (!result) return null;

  if (result.fits) {
    const stepLabel =
      result.density.step === 0
        ? "at the default size"
        : `after stepping down ${result.density.step} of ${DENSITY_LADDER.length - 1} sizes`;
    return (
      <p className="max-w-[65ch] text-center font-sans text-body text-soft">
        Fits on one page {stepLabel} — {result.density.bodyPt}pt body,{" "}
        {Math.round(result.heightPx)}px of 960px used.
      </p>
    );
  }

  return (
    <div className="max-w-[65ch] border-s-2 border-claret bg-panel p-4">
      <p className="font-sans text-body font-semibold text-strong">
        This does not fit on one page.
      </p>
      <p className="mt-1 font-sans text-body text-soft">{result.advice}</p>
      <p className="mt-2 font-sans text-ui text-soft">
        Nothing has been shrunk below {result.density.bodyPt}pt and nothing has been cut — the page
        is {Math.round(result.overflowPx)}px over.
      </p>
    </div>
  );
}

/**
 * PDF page count, read from the document's own page tree. Used to confirm the
 * DOM measurement and the PDF engine agreed before handing over a file.
 */
async function countPages(blob: Blob): Promise<number> {
  const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());
  const declared = text.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/);
  if (declared) return Number(declared[1]);
  return (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length || 1;
}
