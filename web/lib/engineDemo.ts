// Procedural concept engine for the interactive parts explorer. This is an
// illustrative V8 assembly made from primitive geometry, not Ferrari or
// Lamborghini factory geometry, dimensions, part data, or an OEM disassembly.
import * as THREE from "three";
import type { MeshBinding } from "./api";
import type { FixtureGroup } from "./fixture";

type V3 = [number, number, number];
interface EnginePiece { id: number; name: string; meshName: string; step: number | null; offset: V3 | null; system: string }

const pieces: EnginePiece[] = [
  { id: 100, name: "Engine block", meshName: "engine_core", step: null, offset: null, system: "Cylinder banks" },
  { id: 101, name: "Oil sump", meshName: "engine_oil_sump", step: 1, offset: [0, -1.2, 0], system: "Lubrication" },
  { id: 102, name: "Crankshaft", meshName: "engine_crankshaft", step: 2, offset: [0, -0.2, 1.8], system: "Rotating assembly" },
  { id: 103, name: "Front timing cover", meshName: "engine_timing_cover", step: 3, offset: [0, 0.1, -1.65], system: "Front drive" },
  { id: 104, name: "Crank pulley", meshName: "engine_crank_pulley", step: 4, offset: [0, -0.6, -1.9], system: "Front drive" },
  { id: 105, name: "Left cylinder bank", meshName: "engine_bank_left", step: 5, offset: [-1.25, 0.65, 0], system: "Cylinder banks" },
  { id: 106, name: "Right cylinder bank", meshName: "engine_bank_right", step: 5, offset: [1.25, 0.65, 0], system: "Cylinder banks" },
  { id: 107, name: "Left valve cover", meshName: "engine_valve_left", step: 6, offset: [-1.6, 1.1, 0], system: "Cylinder banks" },
  { id: 108, name: "Right valve cover", meshName: "engine_valve_right", step: 6, offset: [1.6, 1.1, 0], system: "Cylinder banks" },
  { id: 109, name: "Left ignition coils", meshName: "engine_coils_left", step: 7, offset: [-1.8, 1.4, 0], system: "Ignition" },
  { id: 110, name: "Right ignition coils", meshName: "engine_coils_right", step: 7, offset: [1.8, 1.4, 0], system: "Ignition" },
  { id: 111, name: "Left exhaust manifold", meshName: "engine_exhaust_left", step: 8, offset: [-1.9, -0.1, 0], system: "Exhaust" },
  { id: 112, name: "Right exhaust manifold", meshName: "engine_exhaust_right", step: 8, offset: [1.9, -0.1, 0], system: "Exhaust" },
  { id: 113, name: "Intake runners", meshName: "engine_intake_runners", step: 9, offset: [0, 1.6, 0], system: "Intake" },
  { id: 114, name: "Intake plenum", meshName: "engine_intake_plenum", step: 10, offset: [0, 2.0, 0.1], system: "Intake" },
  { id: 115, name: "Throttle body", meshName: "engine_throttle_body", step: 11, offset: [0, 2.4, -0.6], system: "Intake" },
  { id: 116, name: "Alternator", meshName: "engine_alternator", step: 12, offset: [-1.8, 0.4, -1.1], system: "Front drive" },
  { id: 117, name: "Coolant pump", meshName: "engine_coolant_pump", step: 12, offset: [1.6, 0.2, -1.3], system: "Cooling" },
  { id: 118, name: "Oil filter", meshName: "engine_oil_filter", step: 13, offset: [1.5, -0.9, 0.7], system: "Lubrication" },
  { id: 119, name: "Accessory belt", meshName: "engine_accessory_belt", step: 14, offset: [0, -0.1, -2.0], system: "Front drive" },
];

export const ENGINE_GROUPS: FixtureGroup[] = [{
  code: "V8-CONCEPT",
  name: "Illustrative V8 engine assembly",
  parts: pieces.map(({ id, name, meshName, system }) => ({ id, name, meshName, system })),
}];

export const ENGINE_SYSTEMS = [...new Set(pieces.map((p) => p.system))].map((name) => ({ code: name, name }));

export const ENGINE_BINDINGS: MeshBinding[] = pieces.map((p) => ({
  meshName: p.meshName, assemblyCode: "V8-CONCEPT", partId: p.id, explode: p.offset, explodeStep: p.step,
}));

const palette = {
  block: new THREE.MeshStandardMaterial({ color: "#535b60", metalness: 0.76, roughness: 0.34 }),
  cast: new THREE.MeshStandardMaterial({ color: "#879197", metalness: 0.78, roughness: 0.3 }),
  bright: new THREE.MeshStandardMaterial({ color: "#c5c9c6", metalness: 0.9, roughness: 0.22 }),
  dark: new THREE.MeshStandardMaterial({ color: "#20282b", metalness: 0.42, roughness: 0.42 }),
  red: new THREE.MeshStandardMaterial({ color: "#a51f28", metalness: 0.48, roughness: 0.29 }),
  copper: new THREE.MeshStandardMaterial({ color: "#b56737", metalness: 0.82, roughness: 0.3 }),
  black: new THREE.MeshStandardMaterial({ color: "#101516", metalness: 0.12, roughness: 0.66 }),
  rubber: new THREE.MeshStandardMaterial({ color: "#17191a", metalness: 0.05, roughness: 0.82 }),
  gold: new THREE.MeshStandardMaterial({ color: "#d3a24b", metalness: 0.7, roughness: 0.28 }),
};

function piece(root: THREE.Group, id: string, draw: (g: THREE.Group) => void) {
  const group = new THREE.Group();
  group.name = id;
  draw(group);
  root.add(group);
  return group;
}

function mesh(g: THREE.Group, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, pos: V3, rot?: V3) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function box(g: THREE.Group, name: string, size: V3, mat: THREE.Material, pos: V3, rot?: V3) {
  return mesh(g, name, new THREE.BoxGeometry(...size), mat, pos, rot);
}

function cylinder(g: THREE.Group, name: string, rTop: number, rBottom: number, length: number, mat: THREE.Material, pos: V3, rot: V3 = [Math.PI / 2, 0, 0], segments = 28) {
  return mesh(g, name, new THREE.CylinderGeometry(rTop, rBottom, length, segments), mat, pos, rot);
}

function tube(g: THREE.Group, name: string, points: V3[], radius: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return mesh(g, name, new THREE.TubeGeometry(curve, 36, radius, 10, false), mat, [0, 0, 0]);
}

/** Build only illustrative geometry; there are intentionally no OEM claims here. */
export function buildEngineConcept(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "illustrative_v8_concept";

  piece(root, "engine_core", (g) => {
    box(g, "engine_core_lower_casting", [1.34, 0.82, 1.7], palette.block, [0, 0.05, 0]);
    box(g, "engine_core_bell_housing", [1.18, 0.68, 0.36], palette.cast, [0, 0.05, 0.93]);
    box(g, "engine_core_rear_plate", [1.14, 0.72, 0.11], palette.bright, [0, 0.05, 1.13]);
    for (const x of [-0.48, 0.48]) for (const z of [-0.58, -0.2, 0.2, 0.58])
      cylinder(g, `engine_core_bore_${x}_${z}`, 0.17, 0.17, 0.36, palette.dark, [x, 0.42, z], [0, 0, 0], 24);
    for (const x of [-0.57, 0.57]) for (const z of [-0.65, 0.65])
      cylinder(g, `engine_core_mount_${x}_${z}`, 0.09, 0.09, 0.18, palette.gold, [x, -0.16, z], [Math.PI / 2, 0, 0], 18);
  });

  piece(root, "engine_oil_sump", (g) => {
    box(g, "engine_sump_upper", [1.18, 0.23, 1.45], palette.cast, [0, -0.47, -0.02]);
    const pan = box(g, "engine_sump_pan", [1.02, 0.32, 1.12], palette.block, [0, -0.72, 0.08]);
    pan.rotation.z = -0.04;
    cylinder(g, "engine_sump_drain_plug", 0.065, 0.065, 0.1, palette.gold, [0.34, -0.8, 0.55], [0, 0, Math.PI / 2], 20);
  });

  piece(root, "engine_crankshaft", (g) => {
    cylinder(g, "engine_crank_main_shaft", 0.095, 0.095, 1.92, palette.bright, [0, -0.03, 0], [Math.PI / 2, 0, 0], 32);
    for (const z of [-0.66, -0.22, 0.22, 0.66]) {
      cylinder(g, `engine_crank_web_${z}`, 0.2, 0.2, 0.1, palette.copper, [0, -0.03, z], [Math.PI / 2, 0, 0], 28);
      cylinder(g, `engine_crank_pin_${z}`, 0.075, 0.075, 0.26, palette.bright, [0.12, -0.03, z], [Math.PI / 2, 0, 0], 20);
    }
  });

  piece(root, "engine_timing_cover", (g) => {
    box(g, "engine_timing_casting", [1.32, 0.88, 0.15], palette.cast, [0, 0.02, -0.91]);
    cylinder(g, "engine_timing_crank_hub", 0.23, 0.23, 0.12, palette.dark, [0, -0.13, -1.01], [0, 0, 0]);
    for (const x of [-0.45, 0.45]) cylinder(g, `engine_timing_cam_hub_${x}`, 0.17, 0.17, 0.11, palette.gold, [x, 0.31, -1.02], [0, 0, 0]);
  });

  piece(root, "engine_crank_pulley", (g) => {
    for (const [i, r] of [0.24, 0.31, 0.37].entries()) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(r, i === 2 ? 0.035 : 0.025, 10, 40), i === 1 ? palette.dark : palette.bright);
      wheel.name = `engine_pulley_rim_${i}`;
      wheel.position.set(0, -0.13, -1.13 - i * 0.025);
      g.add(wheel);
    }
    cylinder(g, "engine_pulley_bolt", 0.095, 0.095, 0.17, palette.gold, [0, -0.13, -1.18], [0, 0, 0], 24);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      cylinder(g, `engine_pulley_fastener_${i}`, 0.024, 0.024, 0.045, palette.bright, [Math.cos(a) * 0.17, -0.13 + Math.sin(a) * 0.17, -1.195], [0, 0, 0], 12);
    }
  });

  for (const sign of [-1, 1] as const) {
    const side = sign < 0 ? "left" : "right";
    const angle = sign * 0.53;
    piece(root, `engine_bank_${side}`, (g) => {
      // The bank has a head casting and four visible cylinder sleeves.
      box(g, `engine_${side}_head_casting`, [0.48, 0.24, 1.72], palette.cast, [sign * 0.49, 0.62, 0], [0, 0, angle]);
      for (let i = 0; i < 4; i++) {
        const z = -0.61 + i * 0.405;
        cylinder(g, `engine_${side}_sleeve_${i + 1}`, 0.155, 0.155, 0.44, palette.bright, [sign * 0.4, 0.4, z], [0, 0, angle], 24);
        cylinder(g, `engine_${side}_bore_inner_${i + 1}`, 0.102, 0.102, 0.46, palette.dark, [sign * 0.4, 0.4, z], [0, 0, angle], 20);
      }
      for (const z of [-0.65, 0.65]) cylinder(g, `engine_${side}_head_bolt_${z}`, 0.045, 0.045, 0.08, palette.gold, [sign * 0.62, 0.72, z], [0, 0, angle], 12);
    });

    piece(root, `engine_valve_${side}`, (g) => {
      box(g, `engine_${side}_valve_cover`, [0.38, 0.15, 1.62], palette.red, [sign * 0.72, 0.9, 0], [0, 0, angle]);
      box(g, `engine_${side}_valve_rail`, [0.24, 0.035, 1.42], palette.bright, [sign * 0.72, 1.0, 0], [0, 0, angle]);
      for (let i = 0; i < 5; i++) cylinder(g, `engine_${side}_cover_fastener_${i}`, 0.025, 0.025, 0.035, palette.gold, [sign * 0.72, 1.04, -0.58 + i * 0.29], [0, 0, 0], 12);
    });

    piece(root, `engine_coils_${side}`, (g) => {
      for (let i = 0; i < 4; i++) {
        const z = -0.56 + i * 0.37;
        box(g, `engine_${side}_coil_${i + 1}`, [0.19, 0.12, 0.18], palette.dark, [sign * 0.64, 1.09, z], [0, 0, angle]);
        cylinder(g, `engine_${side}_plug_boot_${i + 1}`, 0.045, 0.055, 0.2, palette.rubber, [sign * 0.42, 0.79, z], [0, 0, angle], 14);
      }
    });

    piece(root, `engine_exhaust_${side}`, (g) => {
      for (let i = 0; i < 4; i++) {
        const z = -0.58 + i * 0.39;
        tube(g, `engine_${side}_header_primary_${i + 1}`, [
          [sign * 0.72, 0.35, z], [sign * 0.87, 0.12, z], [sign * 1.04, -0.12, z * 0.8], [sign * 1.08, -0.2, 0.08],
        ], 0.045, palette.copper);
      }
      tube(g, `engine_${side}_header_collector`, [[sign * 1.08, -0.2, -0.15], [sign * 1.14, -0.34, 0.08], [sign * 1.08, -0.42, 0.3]], 0.075, palette.copper);
    });
  }

  piece(root, "engine_intake_runners", (g) => {
    for (const sign of [-1, 1]) for (let i = 0; i < 4; i++) {
      const z = -0.58 + i * 0.39;
      tube(g, `engine_intake_runner_${sign}_${i + 1}`, [
        [sign * 0.61, 0.82, z], [sign * 0.48, 1.07, z], [sign * 0.27, 1.24, z], [sign * 0.12, 1.2, z],
      ], 0.055, palette.bright);
    }
  });

  piece(root, "engine_intake_plenum", (g) => {
    const shell = box(g, "engine_intake_plenum_shell", [0.76, 0.25, 1.18], palette.dark, [0, 1.32, 0]);
    shell.material = palette.dark;
    box(g, "engine_intake_plenum_top", [0.7, 0.04, 1.1], palette.bright, [0, 1.47, 0]);
    box(g, "engine_intake_plenum_badge", [0.27, 0.018, 0.36], palette.red, [0, 1.497, 0]);
    for (const z of [-0.42, -0.14, 0.14, 0.42]) cylinder(g, `engine_plenum_rib_${z}`, 0.023, 0.023, 0.74, palette.cast, [0, 1.51, z], [0, 0, Math.PI / 2], 12);
  });

  piece(root, "engine_throttle_body", (g) => {
    cylinder(g, "engine_throttle_intake", 0.19, 0.19, 0.34, palette.cast, [0, 1.31, -0.69], [Math.PI / 2, 0, 0], 32);
    cylinder(g, "engine_throttle_lip", 0.22, 0.22, 0.08, palette.bright, [0, 1.31, -0.86], [Math.PI / 2, 0, 0], 32);
    cylinder(g, "engine_throttle_butterfly", 0.16, 0.16, 0.025, palette.gold, [0, 1.31, -0.91], [Math.PI / 2, 0, 0], 24);
    cylinder(g, "engine_throttle_shaft", 0.025, 0.025, 0.38, palette.dark, [0, 1.31, -0.92], [0, 0, Math.PI / 2], 16);
  });

  piece(root, "engine_alternator", (g) => {
    cylinder(g, "engine_alternator_shell", 0.24, 0.24, 0.35, palette.cast, [-0.93, 0.17, -0.72], [0, 0, Math.PI / 2], 32);
    for (let i = 0; i < 9; i++) box(g, `engine_alternator_vent_${i}`, [0.025, 0.29, 0.06], palette.dark, [-0.93, 0.17, -0.72], [0, i * Math.PI / 9, 0]);
    cylinder(g, "engine_alternator_pulley", 0.12, 0.12, 0.12, palette.dark, [-1.15, 0.17, -0.72], [0, 0, Math.PI / 2], 24);
    box(g, "engine_alternator_mount", [0.38, 0.11, 0.21], palette.bright, [-0.69, -0.08, -0.72], [0, 0, -0.35]);
  });

  piece(root, "engine_coolant_pump", (g) => {
    cylinder(g, "engine_pump_housing", 0.24, 0.21, 0.18, palette.cast, [0.78, 0.16, -0.8], [0, 0, Math.PI / 2], 32);
    cylinder(g, "engine_pump_hub", 0.085, 0.085, 0.16, palette.gold, [0.9, 0.16, -0.8], [0, 0, Math.PI / 2], 20);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const blade = box(g, `engine_pump_blade_${i}`, [0.04, 0.2, 0.055], palette.bright, [0.8, 0.16, -0.8], [0, 0, a]);
      blade.position.x += Math.cos(a) * 0.1;
      blade.position.y += Math.sin(a) * 0.1;
    }
    tube(g, "engine_pump_return_pipe", [[0.9, 0.3, -0.8], [1.0, 0.46, -0.62], [0.88, 0.52, -0.44]], 0.045, palette.cast);
  });

  piece(root, "engine_oil_filter", (g) => {
    cylinder(g, "engine_filter_canister", 0.13, 0.15, 0.43, palette.red, [0.76, -0.44, 0.5], [0.2, 0, -0.35], 32);
    cylinder(g, "engine_filter_base", 0.15, 0.15, 0.06, palette.bright, [0.83, -0.27, 0.43], [0.2, 0, -0.35], 24);
    for (let i = 0; i < 8; i++) box(g, `engine_filter_rib_${i}`, [0.23, 0.015, 0.018], palette.copper, [0.76, -0.44, 0.5], [0, 0, i * Math.PI / 4]);
  });

  piece(root, "engine_accessory_belt", (g) => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 0.24, -1.12), new THREE.Vector3(-0.62, 0.42, -0.91),
      new THREE.Vector3(-0.94, 0.31, -0.73), new THREE.Vector3(-0.92, -0.02, -0.68),
      new THREE.Vector3(-0.64, -0.32, -0.8), new THREE.Vector3(0.28, -0.46, -1.04),
      new THREE.Vector3(0.62, -0.12, -1.02), new THREE.Vector3(0.48, 0.2, -1.13),
    ], true, "centripetal");
    mesh(g, "engine_accessory_belt_loop", new THREE.TubeGeometry(c, 120, 0.035, 12, true), palette.rubber, [0, 0, 0]);
  });

  return root;
}

