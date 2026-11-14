// Phase 3 — interior components of the community 458 Italia model, plus exterior
// pieces found during the interior audit (they live inside "interior_*" meshes).
//
// Audit (2026-11-14, scripts/glb_islands.mjs): islands are matched by world-space
// centre (metres; x = right, y = up, z = rear; the driver sits on the left). Names
// describe position only — not Ferrari part names, no OEM numbers. Unmatched
// islands stay in "<mesh>_rest". Explode offsets are demo values.
import type { ExteriorPart } from "./demo458Exterior";

type V = [number, number, number];
export type InteriorSystem = "INT-SEATS" | "INT-DOOR" | "INT-CONSOLE" | "INT-DASH" | "INT-CABIN" | "STRUCT";

export const INTERIOR_SYSTEMS: { code: InteriorSystem; name: string }[] = [
  { code: "INT-DOOR", name: "Door cards" },
  { code: "INT-SEATS", name: "Seats" },
  { code: "INT-CONSOLE", name: "Centre console" },
  { code: "INT-DASH", name: "Dashboard & instruments" },
  { code: "INT-CABIN", name: "Cabin trim & floor" },
  { code: "STRUCT", name: "Structure & underbody" },
];

export interface InteriorPart { mesh: string; name: string; system: InteriorSystem; source: string; rule?: ExteriorPart["rule"]; explode: V }

const at = (...centres: V[]) => ({ centres });
const box = (min: V, max: V) => ({ box: { min, max } });
const mirror = (v: V): V => [-v[0], v[1], v[2]];

/** One left/right pair; `l` is the left-hand centre, the right one is mirrored unless given. */
function pair(base: string, name: string, system: InteriorSystem, source: string, l: V[], explodeL: V, r?: V[]): InteriorPart[] {
  return [
    { mesh: `${base}_l`, name: `${name} (left)`, system, source, rule: at(...l), explode: explodeL },
    { mesh: `${base}_r`, name: `${name} (right)`, system, source, rule: at(...(r ?? l.map(mirror))), explode: mirror(explodeL) },
  ];
}

/** Exterior pieces that the interior audit uncovered (Phase 2 corrections). */
export const EXTERIOR_FROM_INTERIOR_AUDIT: ExteriorPart[] = [
  { mesh: "ext_front_splitter", name: "Front splitter & lower intakes", system: "EXT-BODY", source: "interior_light", rule: box([-0.95, 0.1, -2.25], [0.95, 0.36, -1.5]), explode: [0, -0.55, -1.3] },
  { mesh: "ext_rear_diffuser", name: "Rear diffuser & under-tail", system: "EXT-BODY", source: "interior_light", rule: box([-0.75, 0.1, 1.4], [0.75, 0.45, 2.3]), explode: [0, -0.55, 1.25] },
  { mesh: "ext_mirror_base_l", name: "Mirror base (left)", system: "EXT-BODY", source: "interior_dark", rule: at([-1.03, 0.86, -0.42]), explode: [-1.3, 0.35, 0] },
  { mesh: "ext_mirror_base_r", name: "Mirror base (right)", system: "EXT-BODY", source: "interior_dark", rule: at([1.03, 0.86, -0.42]), explode: [1.3, 0.35, 0] },
  { mesh: "ext_skirt_inner_l", name: "Side skirt inner (left)", system: "EXT-BODY", source: "interior_dark", rule: at([-0.86, 0.33, 0.17]), explode: [-0.75, -0.35, 0] },
  { mesh: "ext_skirt_inner_r", name: "Side skirt inner (right)", system: "EXT-BODY", source: "interior_dark", rule: at([0.86, 0.33, 0.17]), explode: [0.75, -0.35, 0] },
  { mesh: "ext_headlamp_inner_l", name: "Headlamp inner housing (left)", system: "EXT-LIGHT", source: "interior_dark", rule: at([-0.72, 0.67, -1.75], [-0.72, 0.65, -1.74]), explode: [-0.36, 0.1, -0.85] },
  { mesh: "ext_headlamp_inner_r", name: "Headlamp inner housing (right)", system: "EXT-LIGHT", source: "interior_dark", rule: at([0.72, 0.67, -1.75], [0.71, 0.65, -1.74]), explode: [0.36, 0.1, -0.85] },
  { mesh: "ext_projector_surround_l", name: "Headlamp projector surround (left)", system: "EXT-LIGHT", source: "interior_light", rule: at([-0.68, 0.61, -1.83]), explode: [-0.34, 0.1, -1.2] },
  { mesh: "ext_projector_surround_r", name: "Headlamp projector surround (right)", system: "EXT-LIGHT", source: "interior_light", rule: at([0.68, 0.61, -1.83]), explode: [0.34, 0.1, -1.2] },
  { mesh: "ext_tail_reflector_l", name: "Tail-lamp reflector (left)", system: "EXT-LIGHT", source: "brakes", rule: at([-0.77, 0.88, 2.04]), explode: [-0.38, 0.1, 1.85] },
  { mesh: "ext_tail_reflector_r", name: "Tail-lamp reflector (right)", system: "EXT-LIGHT", source: "brakes", rule: at([0.76, 0.88, 2.04]), explode: [0.38, 0.1, 1.85] },
  { mesh: "ext_tail_inner_l", name: "Tail-lamp inner (left)", system: "EXT-LIGHT", source: "brakes", rule: at([-0.77, 0.88, 1.94]), explode: [-0.38, 0.1, 1.2] },
  { mesh: "ext_tail_inner_r", name: "Tail-lamp inner (right)", system: "EXT-LIGHT", source: "brakes", rule: at([0.77, 0.88, 1.94]), explode: [0.38, 0.1, 1.2] },
  { mesh: "ext_third_brake_inner", name: "Third brake light inner", system: "EXT-LIGHT", source: "brakes", rule: at([0, 0.95, 2.13]), explode: [0, 0.45, 1.45] },
  { mesh: "ext_exhaust_metal", name: "Exhaust inner metal pieces", system: "EXT-TRIM", source: "metal", rule: box([-0.4, 0.35, 2.0], [0.4, 0.5, 2.3]), explode: [0, -0.25, 1.3] },
];

/** Interior disassembly order: doors, seats, console, dashboard, cabin trim, then structure. */
export const INTERIOR_PARTS: InteriorPart[] = [
  ...pair("int_door_rail", "Door top rail", "INT-DOOR", "leather", [[-0.76, 0.83, -0.11]], [-1.5, 0.5, 0], [[0.74, 0.83, -0.11]]),
  ...pair("int_door_upper", "Door upper inner trim", "INT-DOOR", "interior_dark", [[-0.72, 0.97, -0.12]], [-1.4, 0.75, 0], [[0.71, 0.97, -0.12]]),
  ...pair("int_armrest", "Door armrest", "INT-DOOR", "leather", [[-0.72, 0.53, -0.03]], [-1.55, 0.05, 0.25]),
  { mesh: "int_door_pull_r", name: "Door pull (right)", system: "INT-DOOR", source: "leather", rule: at([0.71, 0.63, -0.28]), explode: [1.6, 0.25, -0.2] },
  ...pair("int_door_handle", "Interior door handle", "INT-DOOR", "metal", [[-0.73, 0.56, -0.16], [-0.73, 0.56, -0.1]], [-1.7, 0.2, -0.1]),
  ...pair("int_door_carbon", "Door card carbon insert", "INT-DOOR", "carbon_fibre_trim", [[-0.74, 0.58, -0.13]], [-1.3, 0.1, 0], [[0.73, 0.58, -0.13]]),
  { mesh: "int_door_trim_l", name: "Door card red trim (left)", system: "INT-DOOR", source: "trim", rule: box([-0.75, 0.45, -0.7], [-0.65, 0.85, 0.4]), explode: [-1.2, 0.3, 0] },
  { mesh: "int_door_trim_r", name: "Door card red trim (right)", system: "INT-DOOR", source: "trim", rule: box([0.65, 0.45, -0.7], [0.75, 0.85, 0.4]), explode: [1.2, 0.3, 0] },
  ...pair("int_door_card", "Door card (leather)", "INT-DOOR", "leather", [[-0.73, 0.52, -0.15]], [-1.05, 0, 0], [[0.72, 0.52, -0.15]]),
  ...pair("int_door_lower", "Door card lower piece", "INT-DOOR", "interior_light", [[-0.73, 0.55, -0.12], [-0.72, 0.48, -0.34]], [-0.9, -0.15, 0], [[0.73, 0.55, -0.12], [0.71, 0.48, -0.34]]),

  { mesh: "int_seat_trim_l", name: "Seat red trim (left)", system: "INT-SEATS", source: "trim", rule: box([-0.62, 0.25, -0.45], [-0.08, 0.95, 0.4]), explode: [-0.45, 1.9, 0.35] },
  { mesh: "int_seat_trim_r", name: "Seat red trim (right)", system: "INT-SEATS", source: "trim", rule: box([0.08, 0.25, -0.45], [0.62, 0.95, 0.4]), explode: [0.45, 1.9, 0.35] },
  ...pair("int_seat_back", "Seat back (leather)", "INT-SEATS", "leather", [[-0.35, 0.67, 0.17], [-0.34, 0.67, 0.17]], [-0.4, 1.55, 0.55], [[0.34, 0.67, 0.17]]),
  ...pair("int_seat_shell", "Seat back shell", "INT-SEATS", "interior_dark", [[-0.35, 0.65, 0.2]], [-0.4, 1.3, 0.95], [[0.34, 0.65, 0.2]]),
  { mesh: "int_seat_cushion_l", name: "Seat cushion (left)", system: "INT-SEATS", source: "leather", rule: box([-0.62, 0.25, -0.45], [-0.08, 0.4, 0.15]), explode: [-0.4, 1.05, -0.1] },
  { mesh: "int_seat_cushion_r", name: "Seat cushion (right)", system: "INT-SEATS", source: "leather", rule: box([0.08, 0.25, -0.45], [0.62, 0.4, 0.15]), explode: [0.4, 1.05, -0.1] },

  { mesh: "int_console_carbon", name: "Centre console carbon top", system: "INT-CONSOLE", source: "carbon_fibre_trim", rule: at([0, 0.42, -0.28], [0, 0.39, -0.16]), explode: [0, 1.6, 0.1] },
  { mesh: "int_console_leather", name: "Centre tunnel (leather sides)", system: "INT-CONSOLE", source: "leather", rule: at([0, 0.31, -0.35], [-0.01, 0.36, -0.89]), explode: [0, 1.25, 0.1] },
  { mesh: "int_centre_stack", name: "Centre stack lower", system: "INT-CONSOLE", source: "interior_light", rule: at([-0.01, 0.56, -0.64]), explode: [0, 1.35, -0.5] },

  { mesh: "int_gauges", name: "Instrument gauge faces (×3)", system: "INT-DASH", source: "interior_light", rule: at([-0.23, 0.81, -0.67], [-0.46, 0.81, -0.67], [-0.34, 0.82, -0.68]), explode: [-0.3, 1.9, -0.4] },
  { mesh: "carbon_fibre", name: "Instrument binnacle carbon trim", system: "INT-DASH", explode: [-0.3, 2.2, -0.3], source: "carbon_fibre" },
  { mesh: "int_cluster_carbon", name: "Instrument hood carbon piece", system: "INT-DASH", source: "carbon_fibre_trim", rule: at([-0.34, 0.84, -0.57]), explode: [-0.3, 2.5, -0.3] },
  { mesh: "int_cluster_housing", name: "Instrument cluster housing", system: "INT-DASH", source: "interior_light", rule: at([-0.35, 0.69, -0.55]), explode: [-0.3, 1.6, -0.6] },
  { mesh: "blue", name: "Blue indicator piece (dashboard)", system: "INT-DASH", source: "blue", explode: [-0.6, 1.9, -0.6] },
  { mesh: "int_dash_carbon_l", name: "Dashboard carbon trim (left)", system: "INT-DASH", source: "carbon_fibre_trim", rule: at([-0.6, 0.78, -0.59]), explode: [-0.9, 1.4, -0.7] },
  { mesh: "int_dash_carbon_r", name: "Dashboard carbon trim (passenger side)", system: "INT-DASH", source: "carbon_fibre_trim", rule: at([0.23, 0.78, -0.58]), explode: [0.7, 1.4, -0.7] },
  { mesh: "int_dash_trim", name: "Dashboard red trim pieces", system: "INT-DASH", source: "trim", rule: box([-0.7, 0.5, -0.8], [0.6, 0.9, -0.5]), explode: [0, 1.7, -0.9] },
  { mesh: "int_dash_upper", name: "Dashboard upper (leather)", system: "INT-DASH", source: "leather", rule: at([-0.01, 0.71, -0.72]), explode: [0, 1.15, -1.1] },
  { mesh: "int_dashboard", name: "Dashboard body", system: "INT-DASH", source: "interior_light", rule: at([-0.02, 0.96, -0.61], [-0.01, 0.98, -0.79], [-0.01, 0.81, -0.91], [0, 0.81, -0.97]), explode: [0, 0.9, -1.4] },

  { mesh: "int_mirror", name: "Rear-view mirror", system: "INT-CABIN", source: "interior_light", rule: at([0, 1.08, -0.31], [0, 1.14, -0.35], [0, 1.12, -0.32]), explode: [0, 2.0, -0.6] },
  ...pair("int_visor", "Sun visor", "INT-CABIN", "interior_light", [[-0.29, 1.16, -0.18]], [-0.6, 1.8, -0.3]),
  { mesh: "int_header", name: "Windscreen header trim", system: "INT-CABIN", source: "interior_dark", rule: at([-0.01, 1.19, -0.15]), explode: [0, 1.6, -0.3] },
  ...pair("int_hoop", "Piece behind headrest", "INT-CABIN", "interior_light", [[-0.54, 1.14, 0.54], [-0.69, 1.02, 0.52]], [-0.8, 1.3, 0.8], [[0.53, 1.14, 0.54], [0.69, 1.02, 0.52]]),
  { mesh: "int_bulkhead", name: "Rear bulkhead (behind seats)", system: "INT-CABIN", source: "interior_light", rule: at([-0.01, 0.73, 0.45]), explode: [0, 0.6, 1.4] },
  { mesh: "int_pedals", name: "Pedal-area pieces", system: "INT-CABIN", source: "metal", rule: at([-0.1, 0.3, -1.01], [-0.24, 0.39, -0.92]), explode: [-0.3, 0.9, -1.6] },
  { mesh: "carpet", name: "Carpet", system: "INT-CABIN", source: "carpet", explode: [0, 0.6, 0] },

  { mesh: "int_rear_deck_inner", name: "Rear deck inner structure", system: "STRUCT", source: "interior_dark", rule: at([-0.01, 1.04, 0.94]), explode: [0, 1.5, 1.2] },
  { mesh: "int_engine_bay_top", name: "Engine-bay top piece", system: "STRUCT", source: "interior_dark", rule: at([-0.01, 0.94, 1.64]), explode: [0, 1.4, 1.9] },
  { mesh: "int_underfloor", name: "Underfloor piece", system: "STRUCT", source: "interior_dark", rule: at([-0.05, 0.18, 0.41]), explode: [0, -1.2, 0.4] },
  { mesh: "int_underbody", name: "Underbody plates", system: "STRUCT", source: "metal", rule: at([0, 0.17, 1.27], [-0.05, 0.19, 0.67]), explode: [0, -1.3, 1.1] },
  { mesh: "int_tub", name: "Inner body structure (full length)", system: "STRUCT", source: "interior_dark", rule: at([-0.01, 0.55, -0.04]), explode: [0, -0.7, 0] },
];

/** Interior items a parts explorer would expect but this model does not provide separately. */
export const INTERIOR_MISSING: { component: string; note: string }[] = [
  { component: "Seat frames, rails and adjusters", note: "Only the upholstered seat surfaces and back shells are modelled." },
  { component: "Seat belts and buckles", note: "Not modelled." },
  { component: "Air vents, switches and infotainment screen", note: "Merged into small unlabelled dashboard pieces; not identifiable one by one." },
  { component: "Gear-selector bridge buttons", note: "Not separate from the centre console pieces." },
  { component: "Airbags, wiring, HVAC unit, speakers", note: "Not modelled (no hidden components in this file)." },
  { component: "Engine, gearbox, suspension, fuel tank", note: "Not modelled as separate mechanical parts; only a few unlabelled pieces sit in the engine bay." },
];
