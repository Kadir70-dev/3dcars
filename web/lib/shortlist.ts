"use client";
// Browser-local quote shortlist. Nothing is sent until the visitor submits a quote request.
import { useSyncExternalStore } from "react";

export interface ShortlistItem { kind: "assembly" | "part"; ref: string; label: string }

const KEY = "atlas-quote-v1";
const LEGACY_KEY = "atlas-shortlist"; // prototype format: [{code,title}]
const listeners = new Set<() => void>();
let cache: ShortlistItem[] | null = null;
const EMPTY: ShortlistItem[] = [];

function read(): ShortlistItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw);
    } else {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]") as { code: string; title: string }[];
      cache = legacy.map((x) => ({ kind: "assembly", ref: x.code, label: x.title }));
    }
  } catch {
    cache = [];
  }
  return cache!;
}

function write(items: ShortlistItem[]) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export const shortlist = {
  add(item: ShortlistItem) {
    const cur = read();
    if (!cur.some((x) => x.kind === item.kind && x.ref === item.ref)) write([...cur, item]);
  },
  remove(item: Pick<ShortlistItem, "kind" | "ref">) {
    write(read().filter((x) => !(x.kind === item.kind && x.ref === item.ref)));
  },
  clear() { write([]); },
};

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useShortlist(): ShortlistItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
