import { openDB, type DBSchema } from "idb";
import type { Occurrence } from "./contracts";

interface FieldDB extends DBSchema {
  occurrences: { key: string; value: Occurrence; indexes: { "by-created": string; "by-state": string } };
}

const dbPromise = typeof indexedDB === "undefined" ? null : openDB<FieldDB>("omnibioma", 1, {
  upgrade(db) {
    const store = db.createObjectStore("occurrences", { keyPath: "id" });
    store.createIndex("by-created", "createdAt");
    store.createIndex("by-state", "analysisState");
  }
});

export async function saveOccurrence(item: Occurrence) {
  if (!dbPromise) return;
  await (await dbPromise).put("occurrences", item);
}

export async function getOccurrence(id: string) {
  if (!dbPromise) return undefined;
  return (await dbPromise).get("occurrences", id);
}

export async function listOccurrences() {
  if (!dbPromise) return [];
  const items = await (await dbPromise).getAllFromIndex("occurrences", "by-created");
  return items.reverse();
}

export async function listQueued() {
  if (!dbPromise) return [];
  return (await dbPromise).getAllFromIndex("occurrences", "by-state", "queued");
}

export async function clearOccurrencesForTests() {
  if (!dbPromise) return;
  await (await dbPromise).clear("occurrences");
}
