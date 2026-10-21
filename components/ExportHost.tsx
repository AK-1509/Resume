"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { onExportRequested } from "@/lib/export-event";
import type { Experience, Profile, Skill } from "@/lib/schema";

/**
 * The export dialog pulls in @dnd-kit and the print layout, and from there the
 * PDF renderer. None of it is needed to read the page, so it loads on first
 * use instead of being shipped to every visitor.
 */
const ExportDialog = dynamic(
  () => import("./export/ExportDialog").then((m) => m.ExportDialog),
  { ssr: false },
);

/**
 * Owns the dialog's open state. The "Export resume" button lives in the server-
 * rendered header, so the two talk over the named event in lib/export-event.
 *
 * Rendered outside `.druid-root` so the page's element-level type rules never
 * reach the dialog.
 */
export function ExportHost({
  profile,
  experiences,
  skills,
  languages,
}: {
  profile: Profile;
  experiences: Experience[];
  skills: Skill[];
  languages: string[];
}) {
  const [open, setOpen] = useState(false);
  // Once mounted the dialog stays mounted, so closing it does not discard the
  // selection and ordering the user has already set up.
  const [mounted, setMounted] = useState(false);

  const show = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);

  useEffect(() => onExportRequested(show), [show]);

  if (!mounted) return null;
  return (
    <ExportDialog
      open={open}
      onClose={() => setOpen(false)}
      profile={profile}
      experiences={experiences}
      skills={skills}
      languages={languages}
    />
  );
}
