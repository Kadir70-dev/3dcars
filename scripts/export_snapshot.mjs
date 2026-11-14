// Export the public catalogue from a running Go API into static JSON so the
// Next.js site can run without the API (e.g. on Vercel with NEXT_PUBLIC_STATIC_DATA=1).
//   API_URL=http://127.0.0.1:8088 node scripts/export_snapshot.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API = (process.env.API_URL ?? "http://127.0.0.1:8088") + "/api/v1";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../web/data/snapshot");
const VEHICLE = "ferrari-488-gtb";

async function get(path) {
  const res = await fetch(API + path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

await mkdir(OUT, { recursive: true });
const vehicle = await get(`/vehicles/${VEHICLE}`);
const { assemblies } = await get(`/vehicles/${VEHICLE}/assemblies`);
const details = {};
for (const a of assemblies) details[a.code] = await get(`/vehicles/${VEHICLE}/assemblies/${encodeURIComponent(a.code)}`);
const { parts: vehicleParts } = await get(`/vehicles/${VEHICLE}/search`);
const { sources } = await get(`/sources`);

const storeParts = [];
for (let page = 1; ; page++) {
  const { result, perPage } = await get(`/store-parts?page=${page}`);
  storeParts.push(...result.parts);
  if (result.parts.length < perPage) break;
}
const ids = new Set([...storeParts.map((p) => p.id), ...vehicleParts.map((p) => p.id)]);
const partDetails = {};
for (const id of ids) partDetails[id] = await get(`/parts/${id}`);

const files = { vehicle, assemblies, assemblyDetails: details, vehicleParts, sources, storeParts, partDetails };
for (const [name, data] of Object.entries(files)) await writeFile(resolve(OUT, `${name}.json`), JSON.stringify(data));
await writeFile(resolve(OUT, "meta.json"), JSON.stringify({ exportedAt: new Date().toISOString(), counts: { assemblies: assemblies.length, storeParts: storeParts.length, partDetails: ids.size, sources: sources.length } }, null, 2));
console.log(`snapshot: ${assemblies.length} assemblies, ${storeParts.length} store parts, ${ids.size} part pages, ${sources.length} sources → ${OUT}`);
