/**
 * The hero's export button lives in a server component, while the dialog's
 * state lives in the client body below it. Rather than making the whole page a
 * client component to pass one callback, the two talk over a named event.
 */
const OPEN_EXPORT = "resume:open-export";

export function requestExport() {
  window.dispatchEvent(new Event(OPEN_EXPORT));
}

export function onExportRequested(handler: () => void): () => void {
  window.addEventListener(OPEN_EXPORT, handler);
  return () => window.removeEventListener(OPEN_EXPORT, handler);
}
