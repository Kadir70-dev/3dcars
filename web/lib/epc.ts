// Illustrated-catalogue (EPC) data access. Reads the local, git-ignored ../catalogue/ build output.
// If it is absent (CI, production build, fresh clone) a tiny original DEMO dataset is served instead,
// so the journey always renders and no proprietary data is required to build.
import { promises as fs } from "node:fs";
import path from "node:path";
import { categoryOf, CATEGORY_ORDER, displayName } from "./epcCategories";
import type { DiagramRow } from "./diagramViewer";
import { PLACEHOLDER_ROWS } from "./placeholderDiagram";

export interface EpcModel { key: string; name: string; group: string; groupSlug: string; assemblies: number }
export interface EpcAssembly { id: string; slug: string; number: string | null; name: string; category: string; rows: number }
export interface EpcBrand { slug: string; name: string; models: number; demo: boolean }

const DIR = process.env.EPC_CATALOGUE_DIR ?? path.join(process.cwd(), "..", "catalogue");
const SAFE = /^[a-z0-9][a-z0-9-]{0,120}$/;

interface RawVehicle { vehicle_id: string; engine_group: string; group_slug: string; name: string; slug: string }
interface RawAssembly { assembly_id: string; vehicle: string; engine_group: string; assembly_number: string | null; assembly_name: string; slug: string; path: string; diagram_authorized: boolean; oem_part_numbers: string[] }
interface Store { models: Map<string, EpcModel & { vehicleName: string }>; byModel: Map<string, RawAssembly[]>; demo: boolean }

let cache: Promise<Store> | null = null;

async function build(): Promise<Store> {
  try {
    const [v, a] = await Promise.all([
      fs.readFile(path.join(/* turbopackIgnore: true */ DIR, "metadata", "vehicles.json"), "utf8").then(JSON.parse) as Promise<RawVehicle[]>,
      fs.readFile(path.join(/* turbopackIgnore: true */ DIR, "metadata", "assemblies.json"), "utf8").then(JSON.parse) as Promise<RawAssembly[]>,
    ]);
    const counts = new Map<string, number>();
    v.forEach((x) => counts.set(x.slug, (counts.get(x.slug) ?? 0) + 1));
    const models = new Map<string, EpcModel & { vehicleName: string }>();
    const byName = new Map<string, string>();
    for (const x of v) {
      const key = counts.get(x.slug)! > 1 ? `${x.slug}-${x.group_slug}` : x.slug;
      models.set(key, { key, name: x.name, group: x.engine_group, groupSlug: x.group_slug, assemblies: 0, vehicleName: `${x.engine_group}|${x.name}` });
      byName.set(`${x.engine_group}|${x.name}`, key);
    }
    const byModel = new Map<string, RawAssembly[]>();
    for (const r of a) {
      const key = byName.get(`${r.engine_group}|${r.vehicle}`);
      if (!key) continue;
      (byModel.get(key) ?? byModel.set(key, []).get(key)!).push(r);
      models.get(key)!.assemblies++;
    }
    return { models, byModel, demo: false };
  } catch {
    const m = { key: "demo-model", name: "DEMO MODEL", group: "Demo", groupSlug: "demo", assemblies: 3, vehicleName: "demo" };
    const demoAsm = (n: string, name: string): RawAssembly => ({ assembly_id: `demo-${n}`, vehicle: "demo", engine_group: "Demo", assembly_number: n, assembly_name: `${n}-${name}`, slug: `${n}-${name.toLowerCase().replace(/\W+/g, "-")}`, path: "", diagram_authorized: false, oem_part_numbers: [] });
    return { models: new Map([["demo-model", m]]), byModel: new Map([["demo-model", [demoAsm("001", "Crankcase"), demoAsm("002", "Lubrication pump"), demoAsm("003", "Door panel")]]]), demo: true };
  }
}
const store = () => (cache ??= build());

export async function getBrands(): Promise<EpcBrand[]> {
  const s = await store();
  return [{ slug: "ferrari", name: "Ferrari", models: s.models.size, demo: s.demo }];
}
export async function getModels(): Promise<EpcModel[]> {
  return [...(await store()).models.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name, "en", { numeric: true }));
}
export async function getModel(key: string) {
  if (!SAFE.test(key)) return null;
  const s = await store();
  const m = s.models.get(key);
  if (!m) return null;
  const list: EpcAssembly[] = (s.byModel.get(key) ?? []).map((r) => ({
    id: r.assembly_id, slug: r.slug, number: r.assembly_number, name: displayName(r.assembly_name),
    category: categoryOf(r.assembly_name), rows: r.oem_part_numbers.length,
  }));
  const groups = CATEGORY_ORDER.map((c) => ({ category: c, assemblies: list.filter((x) => x.category === c).sort((a, b) => (a.number ?? "~").localeCompare(b.number ?? "~") || a.name.localeCompare(b.name)) })).filter((g) => g.assemblies.length);
  return { model: m as EpcModel, groups, demo: s.demo };
}
export async function getAssembly(key: string, slug: string) {
  if (!SAFE.test(key) || !SAFE.test(slug)) return null;
  const s = await store();
  const m = s.models.get(key), raw = s.byModel.get(key)?.find((r) => r.slug === slug);
  if (!m || !raw) return null;
  let rows: DiagramRow[] = [];
  if (!s.demo) {
    // raw.path comes from our own build output; still refuse anything escaping the catalogue dir.
    const file = path.resolve(/* turbopackIgnore: true */ DIR, raw.path, "metadata.json");
    if (!file.startsWith(path.resolve(/* turbopackIgnore: true */ DIR) + path.sep)) return null;
    const rec = JSON.parse(await fs.readFile(file, "utf8")) as { references: { ref_no: string; oem_part_number: string; description: string | null; price: number | null; currency: string; quantity: number | null; specification: string | null; superseded_by: string | null; compatible_models: string[] }[] };
    rows = rec.references.map((r) => ({
      ref: r.ref_no, partNumber: r.oem_part_number, description: r.description ?? "", price: r.price, currency: r.currency || "EUR",
      quantity: r.quantity, availability: null, specification: r.specification || null, supersededBy: r.superseded_by || null, models: r.compatible_models,
    }));
  } else rows = PLACEHOLDER_ROWS;
  return { model: m as EpcModel, assembly: { id: raw.assembly_id, slug: raw.slug, number: raw.assembly_number, name: displayName(raw.assembly_name), category: categoryOf(raw.assembly_name), rows: rows.length }, rows, diagramAuthorized: raw.diagram_authorized, demo: s.demo };
}
