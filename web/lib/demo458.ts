// Demo data for the community "Ferrari 458 Italia" glTF (CC BY 4.0). Groups are
// built only from the mesh/node names that exist in that file; explode offsets
// are demonstration values chosen by this project (model space, metres-ish),
// NOT OEM assembly data, and the car is a 458 — not the 488 GTB reference.
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
  changes: "Materials adjusted for display; demo groups and explode offsets added by this project.",
};

let id = 0;
const part = (name: string, meshName: string) => ({ id: ++id, name, meshName });

export const DEMO458_GROUPS: FixtureGroup[] = [
  { code: "D-1", name: "Wheels & brakes", parts: [
    part("Front-left wheel group", "wheel_fl"), part("Front-right wheel group", "wheel_fr"),
    part("Rear-left wheel group", "wheel_rl"), part("Rear-right wheel group", "wheel_rr"),
  ] },
  { code: "D-2", name: "Glazing & wipers", parts: [part("Glass", "glass"), part("Wipers", "wipers")] },
  { code: "D-3", name: "Body shell", parts: [part("Painted body", "body"), part("Grilles", "grills"), part("Chrome trim", "chrome")] },
  { code: "D-4", name: "Lighting", parts: [part("Headlamps", "lights"), part("Tail lamps", "lights_red"), part("LED strips", "leds")] },
  { code: "D-5", name: "Steering", parts: [part("Steering wheel group", "steering_wheel")] },
  { code: "D-6", name: "Interior", parts: [part("Seats (leather)", "leather"), part("Carpet", "carpet"), part("Dark trim", "interior_dark"), part("Light trim", "interior_light")] },
];

const UP = 1.0;
const OFFSETS: Record<string, { explode: [number, number, number]; step: number | null }> = {
  wheel_fl: { explode: [-0.9, 0, 0], step: 1 }, wheel_rl: { explode: [-0.9, 0, 0], step: 1 },
  wheel_fr: { explode: [0.9, 0, 0], step: 1 }, wheel_rr: { explode: [0.9, 0, 0], step: 1 },
  glass: { explode: [0, UP + 0.55, 0], step: 2 }, wipers: { explode: [0, UP + 0.55, -0.3], step: 2 },
  body: { explode: [0, UP, 0], step: 3 }, grills: { explode: [0, UP, 0], step: 3 }, chrome: { explode: [0, UP, 0], step: 3 },
  lights: { explode: [0, UP, 0], step: 3 }, lights_red: { explode: [0, UP, 0], step: 3 }, leds: { explode: [0, UP, 0], step: 3 },
  steering_wheel: { explode: [0, 0.9, -0.2], step: 4 },
};

export const DEMO458_BINDINGS: MeshBinding[] = DEMO458_GROUPS.flatMap((g) =>
  g.parts.map((p) => ({
    meshName: p.meshName, assemblyCode: g.code, partId: p.id,
    explode: OFFSETS[p.meshName]?.explode ?? null, explodeStep: OFFSETS[p.meshName]?.step ?? null,
  })),
);

/** Display-only material tweaks: see-through glass and a glossier paint. */
export function tuneDemo458(root: THREE.Object3D) {
  root.traverse((o) => {
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
