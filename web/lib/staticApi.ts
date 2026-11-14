// Static stand-in for the Go API, used when the site runs without a backend
// (NEXT_PUBLIC_STATIC_DATA=1, e.g. on Vercel). It serves the JSON exported by
// scripts/export_snapshot.mjs and mirrors the API's filtering and paging rules.
import type { Assembly, AssemblyDetail, PartDetail, PartSummary, StorePart, StoreResponse } from "./api";

const VEHICLE = "ferrari-488-gtb";
const PER_PAGE = 48;
const BRANDS = new Set(["Ferrari", "Lamborghini", "Maserati"]);
const NOT_MODEL = new Set(["TO", "UP", "ALL", "AND", "FROM", "FOR", "WITH"]);

export class StaticApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Model word of a FIT line ("FERRARI 488 GTB (USA)" → "488"); mirrors store.ModelWord in Go. */
export function modelWord(brand: string, fit: string): string {
  let u = fit.trim().toUpperCase();
  if (u.startsWith(brand.toUpperCase())) u = u.slice(brand.length);
  const fields = u.split(/\s+/).filter(Boolean);
  while (fields.length && /^(19|20)\d\d$/.test(fields[0])) fields.shift();
  if (!fields.length) return "";
  const w = fields[0].replace(/^[-–,.:]+|[-–,.:]+$/g, "");
  if (w.length < 2 || w.startsWith("(") || NOT_MODEL.has(w) || !/^[A-Z0-9]+$/.test(w)) return "";
  return w;
}

const has = (hay: string | null | undefined, q: string) => (hay ?? "").toLowerCase().includes(q);

export async function staticApi<T>(path: string): Promise<T> {
  const url = new URL(path, "http://snapshot");
  const p = url.pathname;
  const qp = url.searchParams;
  const q = (qp.get("q") ?? "").trim().slice(0, 100).toLowerCase();

  if (p === `/vehicles/${VEHICLE}`) return (await import("../data/snapshot/vehicle.json")).default as T;
  if (p === `/vehicles/${VEHICLE}/assemblies`) {
    const all = (await import("../data/snapshot/assemblies.json")).default as Assembly[];
    return { assemblies: filterAssemblies(all, q, qp.get("system") ?? "", qp.get("assembly") ?? "") } as T;
  }
  if (p.startsWith(`/vehicles/${VEHICLE}/assemblies/`)) {
    const code = decodeURIComponent(p.split("/").pop()!);
    const d = ((await import("../data/snapshot/assemblyDetails.json")).default as unknown as Record<string, AssemblyDetail>)[code];
    if (!d) throw new StaticApiError(404, "not found");
    return d as T;
  }
  if (p === `/vehicles/${VEHICLE}/search`) {
    const system = qp.get("system") ?? "", assembly = qp.get("assembly") ?? "";
    const all = (await import("../data/snapshot/assemblies.json")).default as Assembly[];
    const parts = ((await import("../data/snapshot/vehicleParts.json")).default as PartSummary[]).filter((x) => {
      if (q && !has(x.name, q) && !has(x.oemPartNumber, q)) return false;
      if (assembly && x.assemblyCode !== assembly) return false;
      if (system && !all.some((a) => a.code === x.assemblyCode && a.systemSlug === system)) return false;
      return true;
    });
    return { assemblies: filterAssemblies(all, q, system, assembly), parts } as T;
  }
  if (/^\/parts\/\d+$/.test(p)) {
    const d = ((await import("../data/snapshot/partDetails.json")).default as unknown as Record<string, PartDetail>)[p.split("/")[2]];
    if (!d) throw new StaticApiError(404, "not found");
    return d as T;
  }
  if (p === "/sources") return { sources: (await import("../data/snapshot/sources.json")).default } as T;
  if (p === "/store-parts") return storeParts(qp, q) as T;
  throw new StaticApiError(404, `no static data for ${p}`);
}

function filterAssemblies(all: Assembly[], q: string, system: string, assembly: string): Assembly[] {
  return all.filter((a) => (!q || has(a.name, q) || a.code.includes(q)) && (!system || a.systemSlug === system) && (!assembly || a.code === assembly));
}

async function storeParts(qp: URLSearchParams, q: string): Promise<StoreResponse> {
  const brand = qp.get("brand") ?? "";
  const model = (qp.get("model") ?? "").trim();
  const page = Number.parseInt(qp.get("page") ?? "1", 10);
  if (brand && !BRANDS.has(brand)) throw new StaticApiError(400, "unknown brand");
  if (!/^[A-Za-z0-9 -]{0,40}$/.test(model)) throw new StaticApiError(400, "invalid model");
  if (!(page >= 1 && page <= 200)) throw new StaticApiError(400, "invalid page");
  const all = (await import("../data/snapshot/storeParts.json")).default as unknown as StorePart[];
  const m = model.toUpperCase();
  const hits = all.filter((x) => (!brand || x.brand === brand)
    && (!q || has(x.name, q) || has(x.oemPartNumber, q))
    && (!m || x.fitModels.some((f) => f.toUpperCase().includes(m))));
  const brands: Record<string, number> = {};
  for (const x of all) if (x.brand) brands[x.brand] = (brands[x.brand] ?? 0) + 1;
  const counts = new Map<string, Set<number>>();
  for (const x of all) {
    if (!x.brand || (brand && x.brand !== brand)) continue;
    for (const f of x.fitModels) {
      const w = modelWord(x.brand, f);
      if (w) (counts.get(w) ?? counts.set(w, new Set()).get(w)!).add(x.id);
    }
  }
  const models = [...counts].map(([model, ids]) => ({ model, parts: ids.size }))
    .sort((a, b) => b.parts - a.parts || a.model.localeCompare(b.model)).slice(0, 30);
  return { page, perPage: PER_PAGE, result: { parts: hits.slice((page - 1) * PER_PAGE, page * PER_PAGE), total: hits.length, brands, models } };
}
