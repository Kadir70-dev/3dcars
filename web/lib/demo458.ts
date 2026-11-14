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

export const DEMO458_URL = "/models/demo/ferrari-458-community.glb";

export const DEMO458_ATTRIBUTION = {
  title: "Ferrari 458 Italia",
  author: "vicent091036",
  sourceUrl: "https://sketchfab.com/3d-models/ferrari-458-italia-57bf6cc56931426e87494f554df1dab6",
  via: "https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  checked: "2026-11-14",
  changes: "Materials adjusted for display, duplicate wheel mesh names made unique, and demo part names, order and explode offsets added by this project.",
};

type V = [number, number, number];
const CORNERS = { fl: ["front-left", -1], fr: ["front-right", 1], rl: ["rear-left", -1], rr: ["rear-right", 1] } as const;
const WHEEL_PARTS: [string, string, number][] = [
  // [mesh prefix, label, outward distance]
  ["centre", "Wheel centre", 2.15], ["nuts", "Wheel nuts", 1.9], ["tire", "Tyre", 1.6],
  ["rim", "Rim", 1.3], ["wheel_mesh", "Wheel", 1.0], ["brake", "Brake", 0.55],
];

const ORDER: { mesh: string; name: string; explode: V }[] = [];
for (const [c, [label, side]] of Object.entries(CORNERS)) {
  for (const [prefix, name, d] of WHEEL_PARTS) {
    ORDER.push({ mesh: `${prefix}_${c}`, name: `${name} (${label})`, explode: [side * d, 0, 0] });
  }
}
ORDER.push(
  { mesh: "glass", name: "Glass", explode: [0, 2.1, 0] },
  { mesh: "wipers", name: "Wipers", explode: [0, 1.7, -1.1] },
  { mesh: "lights", name: "Headlights", explode: [0, 0.5, -2.3] },
  { mesh: "lights_red", name: "Tail lights", explode: [0, 0.5, 2.3] },
  { mesh: "leds", name: "LED strips", explode: [0, 1.0, -1.9] },
  { mesh: "grills", name: "Grilles", explode: [0, -0.1, -2.6] },
  { mesh: "body", name: "Body shell", explode: [0, 1.35, 0] },
  { mesh: "chrome", name: "Chrome pieces", explode: [0, 0.2, 2.8] },
  { mesh: "yellow_trim", name: "Yellow trim pieces", explode: [0, 2.6, 0.5] },
  { mesh: "blue", name: "Blue-coloured pieces", explode: [0, 2.9, -0.4] },
  { mesh: "trim", name: "Trim pieces", explode: [-1.4, 0.9, 0.2] },
  { mesh: "carbon_fibre_trim", name: "Carbon-fibre trim", explode: [1.4, 0.9, 0.2] },
  { mesh: "carbon_fibre", name: "Carbon-fibre pieces", explode: [0, -0.7, 1.8] },
  { mesh: "plastic_gray", name: "Grey plastic pieces", explode: [0, -0.7, -1.8] },
  { mesh: "metal", name: "Metal pieces", explode: [1.2, -0.6, 1.2] },
  { mesh: "brakes", name: "Brake pieces", explode: [-1.2, -0.6, 1.2] },
  { mesh: "steering_column", name: "Steering column", explode: [0, 1.2, -0.9] },
  { mesh: "steering_leather", name: "Steering wheel leather", explode: [-0.5, 1.6, -0.9] },
  { mesh: "steering_carbon", name: "Steering wheel carbon", explode: [0.5, 1.6, -0.9] },
  { mesh: "steering_centre", name: "Steering wheel centre", explode: [0, 2.0, -0.9] },
  { mesh: "steering_metal", name: "Steering metal pieces", explode: [-0.5, 2.3, -0.9] },
  { mesh: "steering_trim", name: "Steering trim", explode: [0.5, 2.3, -0.9] },
  { mesh: "steering_red_lights", name: "Steering wheel lights", explode: [0, 2.6, -0.9] },
  { mesh: "leather", name: "Leather (seats & trim)", explode: [0, 1.0, 1.0] },
  { mesh: "interior_dark", name: "Dark interior trim", explode: [-1.0, 0.5, 0.6] },
  { mesh: "interior_light", name: "Light interior trim", explode: [1.0, 0.5, 0.6] },
  { mesh: "carpet", name: "Carpet", explode: [0, -1.0, 0] },
);

export const DEMO_BATCH = 10;
const pad = (n: number) => String(n).padStart(2, "0");

export const DEMO458_GROUPS: FixtureGroup[] = [];
ORDER.forEach((p, i) => {
  const b = Math.floor(i / DEMO_BATCH);
  if (!DEMO458_GROUPS[b]) {
    const last = Math.min(ORDER.length, (b + 1) * DEMO_BATCH);
    DEMO458_GROUPS[b] = { code: `B${b + 1}`, name: `Step ${b + 1} · parts ${b * DEMO_BATCH + 1}–${last}`, parts: [] };
  }
  DEMO458_GROUPS[b].parts.push({ id: i + 1, name: `${pad(i + 1)} · ${p.name}`, meshName: p.mesh });
});

export const DEMO458_BINDINGS: MeshBinding[] = ORDER.map((p, i) => ({
  meshName: p.mesh, assemblyCode: `B${Math.floor(i / DEMO_BATCH) + 1}`, partId: i + 1,
  explode: p.explode, explodeStep: Math.floor(i / DEMO_BATCH) + 1,
}));

/**
 * Display-only preparation: see-through glass, glossier paint, and unique names
 * for the six meshes repeated inside each wheel group (e.g. "tire" → "tire_fl").
 */
export function tuneDemo458(root: THREE.Object3D) {
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
