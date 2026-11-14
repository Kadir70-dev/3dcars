// Original procedural Maserati-inspired GT concept for the interactive viewer.
// It is generated from Three.js primitives and profiles; it is not a factory
// Maserati scan, licensed vehicle asset, exact MC20 geometry, or OEM data.
import * as THREE from "three";
import type { MeshBinding } from "./api";
import type { FixtureGroup } from "./fixture";

type V3 = [number, number, number];
type V2 = [number, number];
interface CarPiece { id: number; name: string; meshName: string; system: string; step: number; offset: V3 }

const pieces: CarPiece[] = [
  { id: 201, name: "Main body shell", meshName: "maserati_body", system: "Body", step: 1, offset: [0, 0.15, 0] },
  { id: 202, name: "Front hood", meshName: "maserati_hood", system: "Body", step: 2, offset: [0, 0.85, -1.4] },
  { id: 203, name: "Cabin and roof", meshName: "maserati_cabin", system: "Glass & cabin", step: 3, offset: [0, 1.2, 0] },
  { id: 204, name: "Windscreen", meshName: "maserati_windscreen", system: "Glass & cabin", step: 4, offset: [0, 1.15, -0.9] },
  { id: 205, name: "Rear glass", meshName: "maserati_rearglass", system: "Glass & cabin", step: 4, offset: [0, 1.1, 0.85] },
  { id: 206, name: "Left door", meshName: "maserati_door_left", system: "Body", step: 5, offset: [-1.3, 0.15, 0.05] },
  { id: 207, name: "Right door", meshName: "maserati_door_right", system: "Body", step: 5, offset: [1.3, 0.15, 0.05] },
  { id: 208, name: "Front grille", meshName: "maserati_grille", system: "Front details", step: 6, offset: [0, 0.1, -1.9] },
  { id: 209, name: "Front splitter", meshName: "maserati_splitter", system: "Front details", step: 6, offset: [0, -0.35, -2.1] },
  { id: 210, name: "Left headlamp", meshName: "maserati_headlamp_left", system: "Lighting", step: 7, offset: [-0.85, 0.35, -1.95] },
  { id: 211, name: "Right headlamp", meshName: "maserati_headlamp_right", system: "Lighting", step: 7, offset: [0.85, 0.35, -1.95] },
  { id: 212, name: "Left tail lamp", meshName: "maserati_taillamp_left", system: "Lighting", step: 8, offset: [-0.8, 0.4, 1.8] },
  { id: 213, name: "Right tail lamp", meshName: "maserati_taillamp_right", system: "Lighting", step: 8, offset: [0.8, 0.4, 1.8] },
  { id: 214, name: "Left front wheel", meshName: "maserati_wheel_fl", system: "Wheels", step: 9, offset: [-1.1, 0, -1.3] },
  { id: 215, name: "Right front wheel", meshName: "maserati_wheel_fr", system: "Wheels", step: 9, offset: [1.1, 0, -1.3] },
  { id: 216, name: "Left rear wheel", meshName: "maserati_wheel_rl", system: "Wheels", step: 9, offset: [-1.1, 0, 1.25] },
  { id: 217, name: "Right rear wheel", meshName: "maserati_wheel_rr", system: "Wheels", step: 9, offset: [1.1, 0, 1.25] },
  { id: 218, name: "Left side mirror", meshName: "maserati_mirror_left", system: "Body", step: 10, offset: [-1.5, 0.55, -0.55] },
  { id: 219, name: "Right side mirror", meshName: "maserati_mirror_right", system: "Body", step: 10, offset: [1.5, 0.55, -0.55] },
  { id: 220, name: "Rear engine cover", meshName: "maserati_engine_cover", system: "Rear details", step: 11, offset: [0, 0.8, 1.2] },
  { id: 221, name: "Rear diffuser", meshName: "maserati_diffuser", system: "Rear details", step: 11, offset: [0, -0.45, 1.9] },
  { id: 222, name: "Left exhaust outlet", meshName: "maserati_exhaust_left", system: "Rear details", step: 12, offset: [-0.55, -0.15, 2.0] },
  { id: 223, name: "Right exhaust outlet", meshName: "maserati_exhaust_right", system: "Rear details", step: 12, offset: [0.55, -0.15, 2.0] },
];

export const MASERATI_GROUPS: FixtureGroup[] = [{
  code: "GT-CONCEPT",
  name: "Maserati-inspired GT concept",
  parts: pieces.map(({ id, name, meshName, system }) => ({ id, name, meshName, system })),
}];

export const MASERATI_SYSTEMS = [...new Set(pieces.map((p) => p.system))].map((name) => ({ code: name, name }));

export const MASERATI_BINDINGS: MeshBinding[] = pieces.map((p) => ({
  meshName: p.meshName, assemblyCode: "GT-CONCEPT", partId: p.id, explode: p.offset, explodeStep: p.step,
}));

const mat = {
  blue: new THREE.MeshStandardMaterial({ color: "#123b60", metalness: 0.78, roughness: 0.2 }),
  blueLight: new THREE.MeshStandardMaterial({ color: "#22618b", metalness: 0.68, roughness: 0.23 }),
  black: new THREE.MeshStandardMaterial({ color: "#090d12", metalness: 0.34, roughness: 0.38 }),
  rubber: new THREE.MeshStandardMaterial({ color: "#111315", metalness: 0.05, roughness: 0.84 }),
  glass: new THREE.MeshPhysicalMaterial({ color: "#78a6bb", metalness: 0.18, roughness: 0.12, transmission: 0.28, transparent: true, opacity: 0.72, clearcoat: 0.9 }),
  silver: new THREE.MeshStandardMaterial({ color: "#b7c2c8", metalness: 0.9, roughness: 0.2 }),
  darkSilver: new THREE.MeshStandardMaterial({ color: "#4f5a61", metalness: 0.82, roughness: 0.27 }),
  red: new THREE.MeshStandardMaterial({ color: "#c32536", metalness: 0.48, roughness: 0.24, emissive: "#260307" }),
  light: new THREE.MeshStandardMaterial({ color: "#fff1d6", emissive: "#ffe9bd", emissiveIntensity: 1.3, roughness: 0.18 }),
  seat: new THREE.MeshStandardMaterial({ color: "#211b1b", metalness: 0.1, roughness: 0.67 }),
};

function addMesh(g: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: V3, rotation?: V3) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function box(g: THREE.Group, name: string, size: V3, material: THREE.Material, position: V3, rotation?: V3) {
  return addMesh(g, name, new THREE.BoxGeometry(...size), material, position, rotation);
}

function sphere(g: THREE.Group, name: string, scale: V3, material: THREE.Material, position: V3) {
  const m = addMesh(g, name, new THREE.SphereGeometry(1, 32, 20), material, position);
  m.scale.set(...scale);
  return m;
}

function extrudedProfile(points: V2[], depth: number, bevel = 0.04) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSegments: 4, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 12 });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function part(root: THREE.Group, name: string, draw: (g: THREE.Group) => void) {
  const g = new THREE.Group();
  g.name = name;
  draw(g);
  root.add(g);
}

function wheel(root: THREE.Group, side: -1 | 1, axle: "front" | "rear") {
  const z = axle === "front" ? -1.28 : 1.22;
  const x = side * 0.92;
  const meshName = `maserati_wheel_${axle === "front" ? "f" : "r"}${side < 0 ? "l" : "r"}`;
  part(root, meshName, (g) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.115, 18, 48), mat.rubber);
    ring.name = `${meshName}_tire`;
    ring.rotation.y = Math.PI / 2;
    ring.position.set(x, 0.45, z);
    g.add(ring);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.035, 12, 48), mat.silver);
    rim.name = `${meshName}_rim`;
    rim.rotation.y = Math.PI / 2;
    rim.position.set(x + side * 0.075, 0.45, z);
    g.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.19, 24), mat.darkSilver);
    hub.name = `${meshName}_hub`;
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x + side * 0.09, 0.45, z);
    g.add(hub);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      const spoke = box(g, `${meshName}_spoke_${i}`, [0.026, 0.34, 0.045], mat.silver, [x + side * 0.085, 0.45 + Math.sin(a) * 0.13, z + Math.cos(a) * 0.13], [a, 0, 0]);
      spoke.rotation.x = a;
    }
    const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 10, 36), mat.red);
    rotor.name = `${meshName}_brake_accent`;
    rotor.rotation.y = Math.PI / 2;
    rotor.position.set(x - side * 0.08, 0.45, z);
    g.add(rotor);
  });
}

/** Build a stylized, original GT coupe concept for viewer and interaction work. */
export function buildMaseratiConcept(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "maserati_gt_concept_scene";

  part(root, "maserati_body", (g) => {
    const body = addMesh(g, "maserati_main_body_profile", extrudedProfile([
      [-2.0, 0.46], [-1.62, 0.66], [-1.18, 0.78], [-0.62, 0.87], [0.42, 0.91],
      [1.18, 0.82], [1.88, 0.72], [2.12, 0.62], [2.03, 0.47], [1.42, 0.39], [-1.42, 0.39],
    ], 1.82, 0.055), mat.blue, [0, 0, 0]);
    body.rotation.y = 0;
    box(g, "maserati_undertray", [1.54, 0.13, 2.8], mat.black, [0, 0.33, 0.02]);
    box(g, "maserati_side_skirt_left", [0.12, 0.16, 1.95], mat.black, [-0.88, 0.42, 0.08]);
    box(g, "maserati_side_skirt_right", [0.12, 0.16, 1.95], mat.black, [0.88, 0.42, 0.08]);
  });

  part(root, "maserati_hood", (g) => {
    const hood = box(g, "maserati_hood_panel", [1.58, 0.12, 1.17], mat.blueLight, [0, 0.91, -1.28], [-0.035, 0, 0]);
    hood.scale.z = 1.02;
    for (const side of [-1, 1]) box(g, `maserati_hood_crease_${side}`, [0.025, 0.014, 0.9], mat.silver, [side * 0.48, 0.977, -1.32], [-0.035, 0, 0]);
  });

  part(root, "maserati_cabin", (g) => {
    addMesh(g, "maserati_cabin_upper_profile", extrudedProfile([
      [-1.2, 0.91], [-0.72, 1.45], [-0.48, 1.61], [0.34, 1.61], [0.7, 1.42], [1.08, 0.87],
    ], 1.43, 0.035), mat.blueLight, [0, 0, 0]);
    for (const side of [-1, 1]) {
      box(g, `maserati_cabin_side_window_${side}`, [0.018, 0.46, 0.92], mat.glass, [side * 0.725, 1.26, -0.04], [0, 0, side * -0.14]);
      box(g, `maserati_cabin_quarter_window_${side}`, [0.018, 0.27, 0.34], mat.glass, [side * 0.725, 1.23, 0.59], [0, 0, side * 0.14]);
      box(g, `maserati_cabin_beltline_${side}`, [0.025, 0.055, 1.27], mat.silver, [side * 0.752, 1.0, -0.02]);
    }
    for (const side of [-1, 1]) for (const z of [-0.39, 0.42]) {
      box(g, `maserati_seat_cushion_${side}_${z}`, [0.47, 0.16, 0.38], mat.seat, [side * 0.35, 0.77, z], [-0.12, 0, side * -0.08]);
      box(g, `maserati_seat_back_${side}_${z}`, [0.46, 0.55, 0.17], mat.seat, [side * 0.35, 1.04, z + 0.14], [-0.1, 0, side * -0.08]);
      box(g, `maserati_headrest_${side}_${z}`, [0.28, 0.15, 0.12], mat.black, [side * 0.35, 1.37, z + 0.16]);
    }
  });

  part(root, "maserati_windscreen", (g) => {
    const wind = box(g, "maserati_windshield_glass", [1.34, 0.055, 0.66], mat.glass, [0, 1.27, -0.73], [0.63, 0, 0]);
    wind.scale.z = 1.1;
    for (const side of [-1, 1]) box(g, `maserati_windshield_pillar_${side}`, [0.07, 0.57, 0.1], mat.blue, [side * 0.67, 1.22, -0.63], [0.48, 0, side * -0.08]);
  });

  part(root, "maserati_rearglass", (g) => {
    box(g, "maserati_rear_window_glass", [1.27, 0.045, 0.7], mat.glass, [0, 1.25, 0.69], [-0.56, 0, 0]);
    for (const side of [-1, 1]) box(g, `maserati_rear_window_pillar_${side}`, [0.07, 0.48, 0.1], mat.blue, [side * 0.62, 1.24, 0.62], [-0.44, 0, side * 0.08]);
  });

  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? "left" : "right";
    part(root, `maserati_door_${sideName}`, (g) => {
      box(g, `maserati_door_skin_${sideName}`, [0.055, 0.43, 1.1], mat.blue, [side * 0.92, 0.78, 0.01], [0, 0, side * -0.015]);
      box(g, `maserati_door_crease_${sideName}`, [0.016, 0.025, 0.82], mat.blueLight, [side * 0.953, 0.69, 0.02]);
      box(g, `maserati_door_handle_${sideName}`, [0.025, 0.035, 0.18], mat.silver, [side * 0.96, 0.86, 0.02]);
      box(g, `maserati_door_lower_intake_${sideName}`, [0.018, 0.13, 0.42], mat.black, [side * 0.958, 0.57, 0.51]);
      box(g, `maserati_door_intake_trim_${sideName}`, [0.022, 0.025, 0.44], mat.silver, [side * 0.97, 0.64, 0.51]);
    });
    part(root, `maserati_mirror_${sideName}`, (g) => {
      box(g, `maserati_mirror_stem_${sideName}`, [0.16, 0.045, 0.12], mat.darkSilver, [side * 0.84, 1.11, -0.55], [0, 0, side * 0.16]);
      sphere(g, `maserati_mirror_cap_${sideName}`, [0.2, 0.12, 0.29], mat.blueLight, [side * 0.99, 1.16, -0.55]);
      box(g, `maserati_mirror_glass_${sideName}`, [0.012, 0.07, 0.19], mat.silver, [side * 1.15, 1.16, -0.55]);
    });
  }

  part(root, "maserati_grille", (g) => {
    const opening = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.075, 14, 48), mat.silver);
    opening.name = "maserati_oval_grille_surround";
    opening.scale.set(0.72, 1.3, 1);
    opening.position.set(0, 0.66, -2.12);
    g.add(opening);
    box(g, "maserati_grille_dark_insert", [0.47, 0.48, 0.08], mat.black, [0, 0.68, -2.11]);
    for (let i = 0; i < 7; i++) box(g, `maserati_grille_vertical_bar_${i}`, [0.018, 0.42, 0.025], mat.silver, [-0.18 + i * 0.06, 0.68, -2.16]);
    box(g, "maserati_grille_badge_mount", [0.16, 0.12, 0.035], mat.blueLight, [0, 0.91, -2.16]);
    // A simple abstract trident accent, not a copied logo asset.
    box(g, "maserati_badge_stem", [0.022, 0.09, 0.018], mat.silver, [0, 0.92, -2.185]);
    for (const x of [-0.045, 0, 0.045]) box(g, `maserati_badge_prong_${x}`, [0.018, 0.065, 0.018], mat.silver, [x, 0.97, -2.185], [0, 0, x * 2]);
  });

  part(root, "maserati_splitter", (g) => {
    box(g, "maserati_front_lip", [1.92, 0.075, 0.25], mat.black, [0, 0.4, -2.14]);
    for (const side of [-1, 1]) box(g, `maserati_front_corner_fin_${side}`, [0.27, 0.09, 0.17], mat.blueLight, [side * 0.78, 0.44, -2.12], [0, 0, side * 0.15]);
  });

  for (const side of [-1, 1] as const) {
    const name = side < 0 ? "left" : "right";
    part(root, `maserati_headlamp_${name}`, (g) => {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat.glass);
      lens.name = `maserati_headlamp_lens_${name}`;
      lens.scale.set(0.25, 0.09, 0.48);
      lens.position.set(side * 0.65, 0.84, -1.88);
      g.add(lens);
      box(g, `maserati_headlamp_led_${name}`, [0.025, 0.035, 0.37], mat.light, [side * 0.65, 0.85, -1.89], [0, 0, side * -0.13]);
      box(g, `maserati_headlamp_brow_${name}`, [0.08, 0.025, 0.48], mat.blueLight, [side * 0.65, 0.94, -1.88], [0, 0, side * -0.12]);
    });
    part(root, `maserati_taillamp_${name}`, (g) => {
      box(g, `maserati_taillamp_lens_${name}`, [0.34, 0.075, 0.09], mat.red, [side * 0.67, 0.91, 1.83], [0, 0, side * -0.1]);
      box(g, `maserati_taillamp_lightbar_${name}`, [0.24, 0.025, 0.045], mat.light, [side * 0.67, 0.93, 1.88]);
    });
  }

  wheel(root, -1, "front"); wheel(root, 1, "front"); wheel(root, -1, "rear"); wheel(root, 1, "rear");

  part(root, "maserati_engine_cover", (g) => {
    box(g, "maserati_rear_engine_glass", [1.16, 0.06, 0.74], mat.glass, [0, 0.98, 1.23]);
    for (let i = 0; i < 6; i++) box(g, `maserati_engine_cover_vent_${i}`, [0.9, 0.018, 0.035], mat.black, [0, 0.95, 0.96 + i * 0.1]);
    for (const side of [-1, 1]) box(g, `maserati_engine_cover_rail_${side}`, [0.045, 0.055, 0.68], mat.blueLight, [side * 0.58, 1.01, 1.22]);
  });

  part(root, "maserati_diffuser", (g) => {
    box(g, "maserati_rear_diffuser_panel", [1.75, 0.12, 0.32], mat.black, [0, 0.43, 1.91]);
    for (let i = 0; i < 7; i++) box(g, `maserati_diffuser_fin_${i}`, [0.035, 0.21, 0.31], mat.darkSilver, [-0.63 + i * 0.21, 0.39, 1.91]);
    box(g, "maserati_rear_bumper_line", [1.62, 0.055, 0.07], mat.blueLight, [0, 0.63, 1.92]);
  });

  for (const side of [-1, 1] as const) {
    const name = side < 0 ? "left" : "right";
    part(root, `maserati_exhaust_${name}`, (g) => {
      const tip = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.028, 12, 32), mat.silver);
      tip.name = `maserati_exhaust_tip_${name}`;
      tip.position.set(side * 0.55, 0.53, 2.03);
      g.add(tip);
      const dark = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), mat.black);
      dark.name = `maserati_exhaust_dark_${name}`;
      dark.position.set(side * 0.55, 0.53, 2.035);
      g.add(dark);
    });
  }

  return root;
}

