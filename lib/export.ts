import type { Occurrence } from "./contracts";

export function exportOccurrence(item: Occurrence) {
  const safe: Partial<Occurrence> = { ...item };
  delete safe.photoDataUrl;
  return { ...safe, localPhotoPresent: Boolean(item.photoDataUrl || item.localPhotoPresent) };
}

export function downloadOccurrences(items: Occurrence[]) {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), occurrences: items.map(exportOccurrence) }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `omnibioma-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
