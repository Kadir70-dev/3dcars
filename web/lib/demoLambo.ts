// Demo data for the community "Lamborghini Centenario LP-770 Interior" glTF by
// SDC PERFORMANCE (CC BY 4.0). Audit 2026-11-14 with scripts/glb_islands.mjs.
// Orientation in this file: x = car's LEFT (driver side), y = up, z = FRONT.
// Every part is an existing mesh, or a geometry island of one, named by where
// it sits or by its material — not Lamborghini part names, no OEM numbers.
// Order and explode offsets are demo values.
import type * as THREE from "three";
import type { MeshBinding } from "./api";
import type { FixtureGroup } from "./fixture";
import { splitByIslands, type IslandRule } from "./meshSplit";

export const LAMBO_URL = "/models/demo/lamborghini-centenario-community.glb";

export const LAMBO_ATTRIBUTION = {
  title: "Lamborghini Centenario LP-770 Interior SDC",
  author: "SDC PERFORMANCE™️",
  sourceUrl: "https://sketchfab.com/3d-models/lamborghini-centenario-lp-770-interior-sdc-d679af35b5694301a185c7454a700c73",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  checked: "2026-11-14",
  changes: "Downloaded as the 1k-texture GLB; meshes are separated along their existing geometry islands at load time (no geometry altered) and demo part names, order and explode offsets are added by this project. The file's door animation is not used.",
};

type V = [number, number, number];
interface Part { mesh: string; name: string; system: string; c: V; d: number; source?: string; rule?: Omit<IslandRule, "name"> }

const L = 1, R = -1; // x sign of the car's left / right side in this file
const BIG = 3;
const side = (s: number) => ({ box: { min: [s > 0 ? 0 : -BIG, -BIG, -BIG] as V, max: [s > 0 ? BIG : 0, BIG, BIG] as V } });
const at = (...centres: V[]) => ({ centres });
const box = (min: V, max: V) => ({ box: { min, max } });
const lr = (s: number) => (s > 0 ? "left" : "right");

/** Demo direction from where the part sits: sides out, nose forward, tail back, roof up, cabin up. */
function explodeFor(c: V, d: number): V {
  if (Math.abs(c[0]) > 0.55 && Math.abs(c[2]) < 1.75) return [Math.sign(c[0]) * d, 0.1, 0];
  if (c[2] >= 1.75) return [c[0] * 0.4, 0.1, d];
  if (c[2] <= -1.75) return [c[0] * 0.4, 0.1, -d];
  if (c[1] > 0.9) return [0, d, 0];
  return [c[0] * 0.6, d, c[2] * 0.15];
}

/** Both sides of a mesh that holds a left and a right copy. */
function pairBySide(mesh: string, name: string, system: string, c: V, d: number, base = mesh): Part[] {
  return [L, R].map((s) => ({ mesh: `${base}_${lr(s)}`, name: `${name} (${lr(s)})`, system, c: [Math.abs(c[0]) * s, c[1], c[2]] as V, d, source: mesh, rule: side(s) }));
}

/** One wheel mesh holds both wheels of an axle; split it into left and right. */
function axle(mesh: string, name: string, axleName: "front" | "rear", z: number, d: number): Part[] {
  return [L, R].map((s) => ({ mesh: `${mesh}_${lr(s)}`, name: `${name} (${axleName}-${lr(s)})`, system: "WHEELS", c: [s * 0.95, 0.39, z] as V, d, source: mesh, rule: side(s) }));
}

const PARTS: Part[] = [
  // Doors: each door is its own set of meshes in the file.
  ...[L, R].flatMap((s) => {
    const o = s > 0 ? { skin: "Object_64", mirror: "Object_65", win: "Object_67", inner: "Object_69", a: "Object_70", b: "Object_71", plas: "Object_72", cuir: "Object_73" }
      : { skin: "Object_76", mirror: "Object_77", win: "Object_79", inner: "Object_81", a: "Object_82", b: "Object_83", plas: "Object_84", cuir: "Object_85" };
    const x = 0.8 * s, t = lr(s);
    return [
      { mesh: o.mirror, name: `Door mirror (${t})`, system: "EXT-BODY", c: [1.01 * s, 0.88, 0.6] as V, d: 1.9 },
      { mesh: o.win, name: `Door window (${t})`, system: "EXT-GLASS", c: [0.72 * s, 0.91, 0.15] as V, d: 1.6 },
      { mesh: o.skin, name: `Door outer skin (${t})`, system: "EXT-BODY", c: [0.94 * s, 0.59, 0.18] as V, d: 1.3 },
      { mesh: o.cuir, name: `Door leather insert (${t})`, system: "INT-DOOR", c: [x, 0.46, 0.49] as V, d: 1.05 },
      { mesh: o.plas, name: `Door plastic trim (${t})`, system: "INT-DOOR", c: [x, 0.46, 0.48] as V, d: 0.95 },
      { mesh: o.b, name: `Door trim piece (${t})`, system: "INT-DOOR", c: [x, 0.58, 0.28] as V, d: 0.9 },
      { mesh: o.a, name: `Door inner detail (${t})`, system: "INT-DOOR", c: [x, 0.6, 0.24] as V, d: 0.85 },
      { mesh: o.inner, name: `Door inner panel (carbon) (${t})`, system: "INT-DOOR", c: [0.81 * s, 0.6, 0.24] as V, d: 0.75 },
    ];
  }),

  // Glass and lamps.
  { mesh: "Object_88_screen", name: "Windscreen", system: "EXT-GLASS", c: [0, 0.95, 0.87], d: 1.7, source: "Object_88", rule: at([0, 0.95, 0.87]) },
  ...[L, R].map((s) => ({ mesh: `Object_88_quarter_${lr(s)}`, name: `Front quarter window (${lr(s)})`, system: "EXT-GLASS", c: [0.79 * s, 0.84, 0.82] as V, d: 1.6, source: "Object_88", rule: at([0.79 * s, 0.84, 0.82]) })),
  ...[L, R].map((s) => ({ mesh: `Object_88_rear_${lr(s)}`, name: `Rear side window (${lr(s)})`, system: "EXT-GLASS", c: [0.68 * s, 0.97, -0.53] as V, d: 1.6, source: "Object_88", rule: at([0.68 * s, 0.97, -0.53]) })),
  { mesh: "Object_89", name: "Rear window glass", system: "EXT-GLASS", c: [0, 1.0, -1.44], d: 1.7 },
  { mesh: "Object_90", name: "Rear window tint layer", system: "EXT-GLASS", c: [0, 0.99, -1.44], d: 1.45 },
  ...[L, R].map((s) => ({ mesh: `Object_87_head_${lr(s)}`, name: `Headlamp glass (${lr(s)})`, system: "EXT-GLASS", c: [0.7 * s, 0.57, 1.92] as V, d: 1.9, source: "Object_87", rule: box(s > 0 ? [0, 0, 1.5] : [-BIG, 0, 1.5], s > 0 ? [BIG, 2, BIG] : [0, 2, BIG]) })),
  ...[L, R].map((s) => ({ mesh: `Object_87_tail_${lr(s)}`, name: `Tail-lamp glass (${lr(s)})`, system: "EXT-GLASS", c: [0.58 * s, 0.71, -2.21] as V, d: 1.9, source: "Object_87", rule: box(s > 0 ? [0, 0, -BIG] : [-BIG, 0, -BIG], s > 0 ? [BIG, 2, -1.5] : [0, 2, -1.5]) })),
  ...pairBySide("Object_97", "Headlamp", "EXT-LIGHT", [0.72, 0.56, 1.92], 1.6),
  ...pairBySide("Object_99", "Headlamp reflectors", "EXT-LIGHT", [0.68, 0.56, 1.98], 1.35),
  ...pairBySide("Object_96", "Tail lamp", "EXT-LIGHT", [0.59, 0.72, -2.22], 1.6),

  // Badges, details and exhaust area.
  { mesh: "Object_101", name: "CENTENARIO lettering", system: "EXT-TRIM", c: [0, 0.5, -0.17], d: 2.2 },
  { mesh: "Object_103", name: "Modeller's SDC logo plate", system: "EXT-TRIM", c: [0.01, 0.39, -2.25], d: 2.0 },
  { mesh: "Object_105", name: "Small rear piece", system: "EXT-TRIM", c: [0, 0.73, -2.45], d: 2.1 },
  { mesh: "Object_107", name: "Roof strip", system: "EXT-TRIM", c: [0, 1.13, -0.49], d: 1.9 },
  { mesh: "Object_98", name: "Front metal detail trim", system: "EXT-TRIM", c: [0, 0.56, 1.9], d: 1.75 },
  { mesh: "Object_94", name: "Rear centre metal piece (exhaust area)", system: "EXT-TRIM", c: [0, 0.36, -2.22], d: 1.55 },
  ...[L, R].map((s) => ({ mesh: `Object_100_low_${lr(s)}`, name: `Rear lower centre piece (${lr(s)})`, system: "EXT-TRIM", c: [0.12 * s, 0.36, -2.21] as V, d: 1.75, source: "Object_100", rule: at([0.12 * s, 0.36, -2.21]) })),
  ...[L, R].map((s) => ({ mesh: `Object_100_up_${lr(s)}`, name: `Rear upper piece (${lr(s)})`, system: "EXT-TRIM", c: [0.48 * s, 0.85, -2.27] as V, d: 1.75, source: "Object_100", rule: at([0.48 * s, 0.85, -2.27]) })),

  // Body: separate islands of the carbon body and trim meshes. The main shell is one island.
  { mesh: "Object_92_wing", name: "Rear wing", system: "EXT-BODY", c: [0, 0.95, -2.35], d: 1.5, source: "Object_92", rule: at([0, 0.95, -2.35]) },
  { mesh: "Object_92_rear_panel", name: "Rear centre panel", system: "EXT-BODY", c: [0, 0.67, -2.31], d: 1.25, source: "Object_92", rule: at([0, 0.67, -2.31]) },
  ...[L, R].map((s) => ({ mesh: `Object_92_tail_surround_${lr(s)}`, name: `Tail-lamp surround (${lr(s)})`, system: "EXT-BODY", c: [0.58 * s, 0.71, -2.21] as V, d: 1.3, source: "Object_92", rule: at([0.58 * s, 0.71, -2.21]) })),
  ...[L, R].map((s) => ({ mesh: `Object_93_tail_carbon_${lr(s)}`, name: `Tail-lamp carbon surround (${lr(s)})`, system: "EXT-BODY", c: [0.61 * s, 0.71, -2.19] as V, d: 1.15, source: "Object_93", rule: at([0.61 * s, 0.71, -2.19]) })),
  ...[L, R].map((s) => ({ mesh: `Object_93_diffuser_${lr(s)}`, name: `Rear diffuser side (${lr(s)})`, system: "EXT-BODY", c: [0.65 * s, 0.48, -2.04] as V, d: 1.0, source: "Object_93", rule: at([0.65 * s, 0.48, -2.04]) })),
  ...[L, R].map((s) => ({ mesh: `Object_95_blades_${lr(s)}`, name: `Rear diffuser blades (${lr(s)})`, system: "EXT-BODY", c: [0.55 * s, 0.46, -2.03] as V, d: 1.35, source: "Object_95", rule: box(s > 0 ? [0, 0, -BIG] : [-BIG, 0, -BIG], s > 0 ? [BIG, 0.8, -1.8] : [0, 0.8, -1.8]) })),
  { mesh: "Object_92_diffuser_fins", name: "Rear diffuser fins", system: "EXT-BODY", c: [0, 0.37, -1.94], d: 1.0, source: "Object_92", rule: box([-0.2, 0.3, -2.05], [0.2, 0.45, -1.85]) },
  { mesh: "Object_92_scoop", name: "Engine-cover scoop", system: "EXT-BODY", c: [0, 0.99, -1.3], d: 1.4, source: "Object_92", rule: at([0, 0.99, -1.3]) },
  ...[L, R].map((s) => ({ mesh: `Object_92_roof_${lr(s)}`, name: `Roof-top piece (${lr(s)})`, system: "EXT-BODY", c: [0.48 * s, 1.12, -0.9] as V, d: 1.6, source: "Object_92", rule: at([0.48 * s, 1.12, -0.9]) })),
  ...[L, R].map((s) => ({ mesh: `Object_92_intake_top_${lr(s)}`, name: `Side intake top (${lr(s)})`, system: "EXT-BODY", c: [0.82 * s, 0.93, -0.75] as V, d: 1.45, source: "Object_92", rule: at([0.82 * s, 0.93, -0.75]) })),
  ...[L, R].map((s) => ({ mesh: `Object_92_intake_fins_${lr(s)}`, name: `Side intake fins (${lr(s)})`, system: "EXT-BODY", c: [0.84 * s, 0.65, -0.86] as V, d: 1.25, source: "Object_92", rule: box(s > 0 ? [0.7, 0.4, -1.15] : [-0.95, 0.4, -1.15], s > 0 ? [0.95, 0.9, -0.55] : [-0.7, 0.9, -0.55]) })),
  ...[L, R].map((s) => ({ mesh: `Object_92_bonnet_vents_${lr(s)}`, name: `Bonnet vent pieces (${lr(s)})`, system: "EXT-BODY", c: [0.43 * s, 0.79, 1.3] as V, d: 1.2, source: "Object_92", rule: box(s > 0 ? [0.2, 0.7, 1.15] : [-0.7, 0.7, 1.15], s > 0 ? [0.7, 0.85, 1.5] : [-0.2, 0.85, 1.5]) })),
  ...[L, R].map((s) => ({ mesh: `Object_93_arch_vent_${lr(s)}`, name: `Front wheel-arch vent (${lr(s)})`, system: "EXT-BODY", c: [0.95 * s, 0.47, 1.56] as V, d: 1.3, source: "Object_93", rule: at([0.95 * s, 0.47, 1.56]) })),
  ...[L, R].map((s) => ({ mesh: `Object_95_splitter_${lr(s)}`, name: `Front splitter (${lr(s)})`, system: "EXT-BODY", c: [0.58 * s, 0.21, 2.0] as V, d: 1.1, source: "Object_95", rule: at([0.58 * s, 0.21, 2.0]) })),
  ...[L, R].map((s) => ({ mesh: `Object_95_skirt_${lr(s)}`, name: `Side skirt (${lr(s)})`, system: "EXT-BODY", c: [0.98 * s, 0.23, -0.13] as V, d: 1.0, source: "Object_95", rule: at([0.98 * s, 0.23, -0.13]) })),
  ...[L, R].map((s) => ({ mesh: `Object_95_roof_rail_${lr(s)}`, name: `Roof rail (${lr(s)})`, system: "EXT-BODY", c: [0.69 * s, 0.98, 0.19] as V, d: 1.3, source: "Object_95", rule: at([0.69 * s, 0.98, 0.19]) })),
  { mesh: "Object_95_rest", name: "Other dark trim pieces", system: "EXT-BODY", c: [0, 0.3, 0], d: 1.0 },
  { mesh: "Object_92_rest", name: "Body shell (main)", system: "EXT-BODY", c: [0, 0.66, 0], d: 0.9 },

  // Wheels (rear axle group Wheel_0, front axle group Wheel.003).
  ...axle("Object_21", "Tyre detail", "front", 1.2, 2.3), ...axle("Object_10", "Tyre detail", "rear", -1.5, 2.3),
  ...axle("Object_19", "Tyre", "front", 1.2, 2.0), ...axle("Object_8", "Tyre", "rear", -1.5, 2.0),
  ...axle("Object_20", "Tyre inner", "front", 1.2, 1.8), ...axle("Object_9", "Tyre inner", "rear", -1.5, 1.8),
  ...axle("Object_17", "Wheel centre lock", "front", 1.2, 2.5), ...axle("Object_23", "Wheel centre lock", "rear", -1.5, 2.5),
  ...axle("Object_15", "Carbon rim", "front", 1.2, 1.55), ...axle("Object_5", "Carbon rim", "rear", -1.5, 1.55),
  ...axle("Object_14", "Wheel centre", "front", 1.2, 1.4), ...axle("Object_4", "Wheel centre", "rear", -1.5, 1.4),
  ...axle("Object_16", "Wheel detail", "front", 1.2, 1.25), ...axle("Object_6", "Wheel detail", "rear", -1.5, 1.25),
  ...axle("Object_18", "Brake disc", "front", 1.2, 0.8), ...axle("Object_7", "Brake disc", "rear", -1.5, 0.8),
  ...[["front", 1], ["rear", -1]].flatMap(([a, zs]) => [L, R].map((s) => ({
    mesh: `Object_12_${a}_${lr(s)}`, name: `Brake caliper (${a}-${lr(s)})`, system: "WHEELS", c: [0.9 * s, 0.54, (zs as number) * 1.2] as V, d: 0.65, source: "Object_12",
    rule: box([s > 0 ? 0 : -BIG, -BIG, (zs as number) > 0 ? 0 : -BIG], [s > 0 ? BIG : 0, BIG, (zs as number) > 0 ? BIG : 0]),
  }))),
  { mesh: "Object_25", name: "Small front piece", system: "WHEELS", c: [0, 0.43, 2.37], d: 1.8 },

  // Steering wheel and display.
  { mesh: "Object_48", name: "Steering wheel logo detail", system: "STEER", c: [0.35, 0.76, 0.11], d: 2.4 },
  { mesh: "Object_47", name: "Steering wheel logo", system: "STEER", c: [0.35, 0.74, 0.12], d: 2.2 },
  { mesh: "Object_51", name: "Steering wheel centre", system: "STEER", c: [0.36, 0.77, 0.12], d: 2.0 },
  { mesh: "Object_49", name: "Steering wheel rim (leather)", system: "STEER", c: [0.36, 0.77, 0.11], d: 1.8 },
  { mesh: "Object_50", name: "Steering wheel trim", system: "STEER", c: [0.36, 0.7, 0.11], d: 1.6 },
  { mesh: "Object_52", name: "Steering column cover", system: "STEER", c: [0.35, 0.72, 0.17], d: 1.4 },
  { mesh: "Object_28", name: "Infotainment display", system: "INT-DASH", c: [0.01, 0.69, 0.33], d: 2.0 },
  { mesh: "Object_29", name: "Display logos", system: "INT-DASH", c: [0.23, 0.77, 0.33], d: 2.2 },

  // Seats (each seat mesh holds both seats).
  ...pairBySide("Object_58", "Seat trim", "INT-SEATS", [0.35, 0.57, -0.4], 2.0),
  ...pairBySide("Object_57", "Seat upholstery", "INT-SEATS", [0.35, 0.47, -0.16], 1.8),
  ...pairBySide("Object_55", "Seat padding", "INT-SEATS", [0.35, 0.57, -0.23], 1.6),
  ...pairBySide("Object_54", "Seat inner part", "INT-SEATS", [0.35, 0.5, -0.23], 1.4),
  ...pairBySide("Object_56", "Seat shell (carbon)", "INT-SEATS", [0.35, 0.67, -0.41], 1.2),

  // Cabin.
  { mesh: "Object_34", name: "Seat-belt piece", system: "INT-CABIN", c: [0.6, 0.34, -0.23], d: 1.6 },
  { mesh: "Object_33", name: "Plastic dash piece", system: "INT-DASH", c: [-0.6, 0.34, -0.23], d: 1.6 },
  { mesh: "Object_32", name: "Air vents", system: "INT-DASH", c: [0.17, 0.59, 0.36], d: 1.9 },
  { mesh: "Object_40", name: "Small interior piece", system: "INT-CABIN", c: [0.01, 0.6, 0.09], d: 1.9 },
  { mesh: "Object_43", name: "Body-colour interior strip", system: "INT-DASH", c: [0, 0.68, 0.33], d: 1.8 },
  { mesh: "Object_41", name: "Dashboard upper strip", system: "INT-DASH", c: [0, 0.71, 0.34], d: 1.7 },
  { mesh: "Object_35", name: "Leather trim (dash, tunnel, binnacle)", system: "INT-DASH", c: [-0.01, 0.63, 0.18], d: 1.5 },
  { mesh: "Object_37", name: "Interior trim (driver side)", system: "INT-DASH", c: [0.26, 0.66, 0.43], d: 1.45 },
  { mesh: "Object_42", name: "Interior carbon trim", system: "INT-DASH", c: [0.21, 0.7, 0.24], d: 1.35 },
  { mesh: "Object_38", name: "Interior plastic trim", system: "INT-CABIN", c: [-0.15, 0.67, 0.58], d: 1.3 },
  { mesh: "Object_36", name: "Interior trim pieces", system: "INT-CABIN", c: [0.03, 0.53, 0.65], d: 1.25 },
  { mesh: "Object_31", name: "Dashboard", system: "INT-DASH", c: [0, 0.71, -0.01], d: 1.15 },
  { mesh: "Object_39", name: "Pedal-area pieces", system: "INT-CABIN", c: [0.32, 0.39, 0.73], d: 1.1 },
  { mesh: "Object_45", name: "Footwell trim", system: "INT-CABIN", c: [0.01, 0.52, 0.46], d: 1.0 },
  { mesh: "Object_44", name: "Cabin floor and tub", system: "STRUCT", c: [-0.02, 0.55, 0.05], d: 0.7 },

  // Engine bay (mid-engine, behind the cabin): the visible top of the engine, separated
  // along its own geometry islands. Nothing inside the engine is modelled in this file.
  { mesh: "eng_brace_mid", name: "Engine-bay cross brace (middle)", system: "ENGINE", c: [0.05, 0.9, -1.31], d: 2.6, source: "Object_60", rule: at([0.05, 0.9, -1.31]) },
  { mesh: "eng_brace_rear", name: "Engine-bay cross brace (rear)", system: "ENGINE", c: [0.04, 0.82, -1.68], d: 2.45, source: "Object_60", rule: at([0.04, 0.82, -1.68]) },
  { mesh: "eng_rings_l", name: "Engine chrome rings & bolts (left)", system: "ENGINE", c: [0.36, 0.84, -1.24], d: 2.3, source: "Object_61", rule: box([0.28, 0.74, -1.45], [0.45, 0.92, -1.05]) },
  { mesh: "eng_rings_r", name: "Engine chrome rings & bolts (right)", system: "ENGINE", c: [-0.26, 0.84, -1.23], d: 2.3, source: "Object_61", rule: box([-0.34, 0.74, -1.45], [-0.18, 0.92, -1.05]) },
  { mesh: "eng_housing_lf", name: "Engine top housing (left-front)", system: "ENGINE", c: [0.48, 0.84, -1.16], d: 2.05, source: "Object_60", rule: at([0.48, 0.84, -1.16]) },
  { mesh: "eng_housing_lr", name: "Engine top housing (left-rear)", system: "ENGINE", c: [0.52, 0.82, -1.35], d: 2.05, source: "Object_60", rule: at([0.52, 0.82, -1.35]) },
  { mesh: "eng_housing_rf", name: "Engine top housing (right-front)", system: "ENGINE", c: [-0.38, 0.84, -1.13], d: 2.05, source: "Object_60", rule: at([-0.38, 0.84, -1.13]) },
  { mesh: "eng_housing_rr", name: "Engine top housing (right-rear)", system: "ENGINE", c: [-0.42, 0.82, -1.33], d: 2.05, source: "Object_60", rule: at([-0.42, 0.82, -1.33]) },
  { mesh: "eng_chrome_rear_l", name: "Engine chrome rear piece (left)", system: "ENGINE", c: [0.32, 0.77, -1.84], d: 1.85, source: "Object_61", rule: at([0.32, 0.77, -1.84]) },
  { mesh: "eng_chrome_rear_r", name: "Engine chrome rear piece (right)", system: "ENGINE", c: [-0.24, 0.77, -1.83], d: 1.85, source: "Object_61", rule: at([-0.24, 0.77, -1.83]) },
  { mesh: "eng_strip_l", name: "Engine side strip (left)", system: "ENGINE", c: [0.42, 0.77, -1.67], d: 1.7, source: "Object_60", rule: at([0.42, 0.77, -1.67]) },
  { mesh: "eng_strip_r", name: "Engine side strip (right)", system: "ENGINE", c: [-0.34, 0.77, -1.65], d: 1.7, source: "Object_60", rule: at([-0.34, 0.77, -1.65]) },
  { mesh: "eng_rear_bar", name: "Rear engine cross bar", system: "ENGINE", c: [0.03, 0.82, -1.92], d: 1.6, source: "Object_60", rule: at([0.03, 0.82, -1.92]) },
  { mesh: "eng_rear_pieces", name: "Rear engine pieces", system: "ENGINE", c: [0.04, 0.78, -1.86], d: 1.45, source: "Object_60", rule: box([-0.1, 0.7, -2.05], [0.2, 0.9, -1.75]) },
  { mesh: "eng_bank_l", name: "Engine bank cover (left)", system: "ENGINE", c: [0.24, 0.79, -1.34], d: 1.3, source: "Object_60", rule: at([0.24, 0.79, -1.34]) },
  { mesh: "eng_bank_r", name: "Engine bank cover (right)", system: "ENGINE", c: [-0.14, 0.79, -1.33], d: 1.3, source: "Object_60", rule: at([-0.14, 0.79, -1.33]) },
  { mesh: "eng_valley", name: "Engine centre piece", system: "ENGINE", c: [0.03, 0.74, -1.42], d: 1.1, source: "Object_60", rule: at([0.03, 0.74, -1.42]) },
  { mesh: "Object_60_rest", name: "Small engine piece", system: "ENGINE", c: [0.04, 0.87, -1.5], d: 2.8 },
];

/** Island split rules per source mesh. */
export const LAMBO_SPLITS: Record<string, IslandRule[]> = {};
for (const p of PARTS) if (p.source && p.rule) (LAMBO_SPLITS[p.source] ??= []).push({ name: p.mesh, ...p.rule });

export const LAMBO_BATCH = 10;
export const LAMBO_GROUPS: FixtureGroup[] = [];
PARTS.forEach((p, i) => {
  const b = Math.floor(i / LAMBO_BATCH);
  LAMBO_GROUPS[b] ??= { code: `L${b + 1}`, name: `Step ${b + 1}`, parts: [] };
  LAMBO_GROUPS[b].parts.push({ id: i + 1, name: p.name, meshName: p.mesh, system: p.system });
});

export const LAMBO_BINDINGS: MeshBinding[] = PARTS.map((p, i) => ({
  meshName: p.mesh, assemblyCode: `L${Math.floor(i / LAMBO_BATCH) + 1}`, partId: i + 1,
  explode: explodeFor(p.c, p.d), explodeStep: Math.floor(i / LAMBO_BATCH) + 1,
}));

/** Load-time preparation: split meshes along their existing geometry islands. */
export function tuneLambo(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const toSplit: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh && LAMBO_SPLITS[o.name]) toSplit.push(o as THREE.Mesh); });
  for (const m of toSplit) splitByIslands(m, LAMBO_SPLITS[m.name]);
}

export const LAMBO_PART_COUNT = PARTS.length;
