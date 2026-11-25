// Pure helpers + types for the interactive diagram viewer (no DOM, unit-tested).

export interface DiagramRow {
  ref: string;                 // number printed on the diagram
  partNumber: string;          // OEM part number
  description: string;
  price: number | null;        // original EUR amount as shown by the source; null = unknown
  currency: string;
  quantity: number | null;     // quantity per assembly, never stock
  availability?: string | null; // caller-resolved label; raw source flags are unverified
  specification?: string | null;
  supersededBy?: string | null;
  models?: string[];
}
export interface Callout { ref: string; x: number; y: number }   // viewBox units of the diagram
export interface DiagramSource { src: string; width: number; height: number; alt: string }
export interface Transform { k: number; x: number; y: number }

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const IDENTITY: Transform = { k: 1, x: 0, y: 0 };

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Keep the scaled content covering the viewport (no panning into empty space). */
export function clampTransform(t: Transform, w: number, h: number): Transform {
  const k = clamp(t.k, MIN_ZOOM, MAX_ZOOM);
  return { k, x: clamp(t.x, w - w * k, 0), y: clamp(t.y, h - h * k, 0) };
}

/** Zoom by `factor` keeping the viewport point (px,py) fixed. */
export function zoomAt(t: Transform, factor: number, px: number, py: number, w: number, h: number): Transform {
  const k = clamp(t.k * factor, MIN_ZOOM, MAX_ZOOM);
  const r = k / t.k;
  return clampTransform({ k, x: px - (px - t.x) * r, y: py - (py - t.y) * r }, w, h);
}

/** Pan so the viewport centre lands on a diagram point (fx,fy in 0..1 of the diagram). */
export function centerOn(t: Transform, fx: number, fy: number, w: number, h: number): Transform {
  return clampTransform({ k: t.k, x: w / 2 - fx * w * t.k, y: h / 2 - fy * h * t.k }, w, h);
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, "");

/** OEM-number / description / reference search. Empty query matches everything. */
export function matchesQuery(r: DiagramRow, q: string): boolean {
  const n = norm(q);
  if (!n) return true;
  return norm(r.partNumber).includes(n) || norm(r.description).includes(n) || norm(r.ref) === n;
}

export function formatPrice(price: number | null, currency = "EUR"): string {
  if (price == null) return "On request";
  if (price === 0) return "Price on request";
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency}`;
  }
}
