// Typed client for the Go catalog API. Server components call API_URL directly;
// browser code calls the same-origin /api/v1 rewrite.

export type Verification = "verified" | "publicly_listed" | "unverified" | "source_required" | "disputed";

export interface Provenance {
  sourceId: number;
  sourceTitle: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceRef: string | null;
  checkedOn: string | null;
  scopeNote: string | null;
  verificationStatus: Verification;
}

export interface Fact { label: string; value: string; provenance: Provenance }
export interface System { slug: string; name: string; assemblyCount: number }
export interface DataGap { area: string; missing: string; accessNeeded: string; status: string }
export interface MeshBinding {
  meshName: string; assemblyCode: string | null; partId: number | null;
  explode: [number, number, number] | null; explodeStep?: number | null;
}
export interface Asset3D {
  id: number; title: string; url: string; licensor: string; licenseName: string;
  licenseUrl: string | null; isRealVehicleGeometry: boolean; bindings: MeshBinding[];
}
export interface VehicleDetail {
  id: number; slug: string; make: string; model: string; market: string | null; summary: string | null;
  facts: Fact[]; systems: System[]; dataGaps: DataGap[];
  counts: { assemblies: number; parts: number; verifiedParts: number; fitments: number; modelYears: number };
  model3d: Asset3D | null;
}
export interface Assembly {
  code: string; name: string; summary: string | null; systemSlug: string | null; systemName: string | null;
  partCount: number; provenance: Provenance;
}
export interface PartSummary {
  id: number; oemPartNumber: string | null; name: string; quantity?: number | null; diagramRef?: string | null;
  assemblyCode?: string | null; assemblyName?: string | null;
  /** Client's store page and product photo, when the part comes from the client catalogue. */
  listingUrl?: string | null; imageUrl?: string | null; provenance: Provenance;
}
export interface Spec { key: string; value: string; unit: string | null; provenance: Provenance }
export interface Fitment {
  vehicleSlug: string; modelYear: number | null; market: string | null; vinFrom: string | null; vinTo: string | null;
  notes: string | null; provenance: Provenance;
}
export interface PartDetail extends PartSummary {
  description: string | null; revision: string | null; assemblies: PartSummary[]; specs: Spec[]; fitments: Fitment[];
  brand?: string | null; fitModels?: string[];
}
export interface AssemblyDetail extends Assembly { parts: PartSummary[] }
export interface StorePart extends PartSummary { brand: string | null; fitModels: string[] }
export interface StoreResponse {
  page: number; perPage: number;
  result: { parts: StorePart[]; total: number; brands: Record<string, number>; models: { model: string; parts: number }[] };
}
export interface Source {
  id: number; title: string; publisher: string; sourceType: string; url: string | null;
  licenseNotes: string | null; accessRequirements: string | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const base = () => (typeof window === "undefined" ? process.env.API_URL ?? "http://127.0.0.1:8088" : "");

/** True when the site runs without the Go API and serves the exported snapshot instead. */
export const STATIC_DATA = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

export async function api<T>(path: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  if (STATIC_DATA && (!init?.method || init.method === "GET")) {
    const { staticApi, StaticApiError } = await import("./staticApi");
    try {
      return await staticApi<T>(path);
    } catch (e) {
      if (e instanceof StaticApiError) throw new ApiError(e.status, e.message);
      throw e;
    }
  }
  const { revalidate, ...rest } = init ?? {};
  const res = await fetch(base() + "/api/v1" + path, {
    ...rest,
    ...(typeof window === "undefined" ? { next: { revalidate: revalidate ?? 60 } } : {}),
    headers: { Accept: "application/json", ...(rest.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error ?? msg; } catch { /* keep status text */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const VEHICLE = "ferrari-488-gtb";

export const statusLabel: Record<Verification, string> = {
  verified: "Verified",
  publicly_listed: "Listed",
  unverified: "Not verified",
  source_required: "Source required",
  disputed: "Disputed",
};

export function formatDate(d: string | null): string {
  if (!d) return "Not recorded";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
