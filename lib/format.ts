const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

function parts(month: string): { year: string; month: string } {
  const [year, mm] = month.split("-");
  return { year, month: MONTHS[Number(mm) - 1] };
}

/**
 * Duration for a collapsed card, e.g. "MAY — AUG 2025", "SEP 2024 — APR 2025",
 * "JAN 2025 — PRESENT".
 *
 * Month precision matters here even though the card is the collapsed state:
 * "how long did you work there" has to be answerable without opening anything.
 * The repeated year is dropped when start and end share one, which keeps the
 * common summer-internship case short.
 */
export function formatDuration(startDate: string, endDate: string | null): string {
  const start = parts(startDate);
  if (endDate === null) return `${start.month} ${start.year} — PRESENT`;

  const end = parts(endDate);
  if (start.year === end.year) {
    return start.month === end.month
      ? `${start.month} ${start.year}`
      : `${start.month} — ${end.month} ${end.year}`;
  }
  return `${start.month} ${start.year} — ${end.month} ${end.year}`;
}
