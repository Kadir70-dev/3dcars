// Demo data for the community "Ferrari 458 Italia" glTF (CC BY 4.0). Every part
// below is one mesh that exists in that file; names are plain-English readings of
// the file's own mesh names (the model is split by material, so some are generic,
// e.g. "Grey plastic pieces"). Order, batches of 10 and explode offsets are
// demonstration values chosen by this project (model space, metres-ish) — NOT OEM
// assembly data — and the car is a 458, not the 488 GTB reference. Mesh names are as
// GLTFLoader exposes them (spaces become underscores, e.g. "carbon fibre" → "carbon_fibre").
import type * as THREE from "three";
import type { MeshBinding } from "./api";
import type { FixtureGroup } from "./fixture";
import { splitByIslands } from "./meshSplit";
import { EXTERIOR_PARTS, EXTERIOR_SPLITS, EXTERIOR_SYSTEMS } from "./demo458Exterior";

export const DEMO458_URL = "/models/demo/ferrari-458-community.glb";

export const DEMO458_ATTRIBUTION = {
  title: "Ferrari 458 Italia",
  author: "vicent091036",
  sourceUrl: "https://sketchfab.com/3d-models/ferrari-458-italia-57bf6cc56931426e87494f554df1dab6",
  via: "https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  checked: "2026-11-14",
  changes: "Materials adjusted for display, exterior meshes separated along their existing geometry islands (no geometry altered), duplicate wheel mesh names made unique, and demo part names, order and explode offsets added by this project.",
};

type V = [number, number, number];
const CORNERS = { fl: ["front-left", -1], fr: ["front-right", 1], rl: ["rear-left", -1], rr: ["rear-right", 1] } as const;
const WHEEL_PARTS: [string, string, number][] = [
  // [mesh prefix, label, outward distance]
  ["centre", "Wheel centre", 2.15], ["nuts", "Wheel nuts", 1.9], ["tire", "Tyre", 1.6],
  ["rim", "Rim", 1.3], ["wheel_mesh", "Wheel", 1.0], ["brake", "Brake", 0.55],
];

export const DEMO458_SYSTEMS = [
  ...EXTERIOR_SYSTEMS,
  { code: "WHEELS", name: "Wheels & brakes" },
  { code: "STEER", name: "Steering" },
  { code: "OTHER", name: "Interior & other (Phase 3)" },
];

const ORDER: { mesh: string; name: string; explode: V; system: string }[] = EXTERIOR_PARTS.map((p) => ({ mesh: p.mesh, name: p.name, explode: p.explode, system: p.system }));
for (const [c, [label, side]] of Object.entries(CORNERS)) {
  for (const [prefix, name, d] of WHEEL_PARTS) {
    ORDER.push({ mesh: `${prefix}_${c}`, name: `${name} (${label})`, explode: [side * d, 0, 0], system: "WHEELS" });
  }
}
const other = (mesh: string, name: string, explode: V) => ({ mesh, name, explode, system: "OTHER" });
ORDER.push(
  { mesh: "steering_column", name: "Steering column", explode: [0, 1.2, -0.9], system: "STEER" },
  { mesh: "steering_leather", name: "Steering wheel leather", explode: [-0.5, 1.6, -0.9], system: "STEER" },
  { mesh: "steering_carbon", name: "Steering wheel carbon", explode: [0.5, 1.6, -0.9], system: "STEER" },
  { mesh: "steering_centre", name: "Steering wheel centre", explode: [0, 2.0, -0.9], system: "STEER" },
  { mesh: "steering_metal", name: "Steering metal pieces", explode: [-0.5, 2.3, -0.9], system: "STEER" },
  { mesh: "steering_trim", name: "Steering trim", explode: [0.5, 2.3, -0.9], system: "STEER" },
  { mesh: "steering_red_lights", name: "Steering wheel lights", explode: [0, 2.6, -0.9], system: "STEER" },
  // Not exterior: kept as whole material groups until Phase 3 audits the interior.
  other("chrome_rest", "Other chrome pieces (mostly interior)", [0, 1.9, 0.2]),
  other("plastic_gray_rest", "Other grey plastic pieces (interior)", [0, -0.7, -1.4]),
  other("glass_rest", "Small interior glass pieces", [0, 2.2, -0.5]),
  other("lights_red_rest", "Other red lamp pieces (interior)", [0, 1.5, 0.5]),
  other("yellow_trim_rest", "Other yellow trim piece (interior)", [0, 2.6, 0.5]),
  other("blue", "Blue-coloured pieces", [0, 2.9, -0.4]),
  other("trim", "Trim pieces", [-1.4, 0.9, 0.2]),
  other("carbon_fibre_trim", "Carbon-fibre trim", [1.4, 0.9, 0.2]),
  other("carbon_fibre", "Carbon-fibre pieces", [0, -0.7, 1.8]),
  other("metal", "Metal pieces", [1.2, -0.6, 1.2]),
  other("brakes", "Brake pieces", [-1.2, -0.6, 1.2]),
  other("leather", "Leather (seats & trim)", [0, 1.0, 1.0]),
  other("interior_dark", "Dark interior trim", [-1.0, 0.5, 0.6]),
  other("interior_light", "Light interior trim", [1.0, 0.5, 0.6]),
  other("carpet", "Carpet", [0, -1.0, 0]),
);

export const DEMO_BATCH = 10;
const pad = (n: number) => String(n).padStart(3, "0");

export const DEMO458_GROUPS: FixtureGroup[] = [];
ORDER.forEach((p, i) => {
  const b = Math.floor(i / DEMO_BATCH);
  if (!DEMO458_GROUPS[b]) {
    const last = Math.min(ORDER.length, (b + 1) * DEMO_BATCH);
    DEMO458_GROUPS[b] = { code: `B${b + 1}`, name: `Step ${b + 1} · parts ${b * DEMO_BATCH + 1}–${last}`, parts: [] };
  }
  DEMO458_GROUPS[b].parts.push({ id: i + 1, name: `${pad(i + 1)} · ${p.name}`, meshName: p.mesh, system: p.system });
});

export const DEMO458_BINDINGS: MeshBinding[] = ORDER.map((p, i) => ({
  meshName: p.mesh, assemblyCode: `B${Math.floor(i / DEMO_BATCH) + 1}`, partId: i + 1,
  explode: p.explode, explodeStep: Math.floor(i / DEMO_BATCH) + 1,
}));

/**
 * Load-time preparation: split exterior meshes into their existing geometry islands
 * (no geometry or material changes), see-through glass, glossier paint, and unique
 * names for the six meshes repeated inside each wheel group (e.g. "tire" → "tire_fl").
 */
export function tuneDemo458(root: THREE.Object3D) {
  // Phase 2: separate exterior components along the model's own geometry islands.
  root.updateMatrixWorld(true);
  const toSplit: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh && EXTERIOR_SPLITS[o.name]) toSplit.push(o as THREE.Mesh); });
  for (const m of toSplit) splitByIslands(m, EXTERIOR_SPLITS[m.name]);
  root.traverse((o) => {
    const corner = /^wheel_(fl|fr|rl|rr)$/.exec(o.name)?.[1];
    if (corner) {
      for (const c of o.children) {
        if (c.name.endsWith(`_${corner}`)) continue;
        // GLTFLoader de-duplicates repeated names as "tire", "tire_1", "tire_2"…; key them by corner instead.
        const base = c.name.replace(/_\d+$/, "");
        c.name = `${base === "wheel" ? "wheel_mesh" : base}_${corner}`;
      }
    }
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const std = mat as THREE.MeshStandardMaterial;
      if (/glass/i.test(mat.name)) { mat.transparent = true; mat.opacity = 0.35; mat.depthWrite = false; }
      if (mat.name === "Body_Color") { std.metalness = 0.6; std.roughness = 0.28; }
      if (/chrome/i.test(mat.name)) { std.metalness = 1; std.roughness = 0.15; }
    }
  });
}
