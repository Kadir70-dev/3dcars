// Phase 2 — exterior components of the community 458 Italia model.
//
// Audit (2026-11-14, scripts/glb_islands.mjs): the file has no separate door,
// bonnet or bumper meshes, but several meshes contain disconnected geometry
// "islands". Each component below is one or more of those islands, matched by
// the island's world-space centre (metres, x = right, y = up, z = rear). Names
// describe the position of the piece in this model; they are not Ferrari part
// names and carry no OEM numbers. Islands not listed stay in "<mesh>_rest".
import type { IslandRule } from "./meshSplit";

type V = [number, number, number];
export type SystemCode = "EXT-BODY" | "EXT-GLASS" | "EXT-LIGHT" | "EXT-GRILLE" | "EXT-TRIM";

export const EXTERIOR_SYSTEMS: { code: SystemCode; name: string }[] = [
  { code: "EXT-BODY", name: "Body panels" },
  { code: "EXT-GLASS", name: "Glass" },
  { code: "EXT-LIGHT", name: "Lighting" },
  { code: "EXT-GRILLE", name: "Grilles & vents" },
  { code: "EXT-TRIM", name: "Badges, exhaust & wipers" },
];

export interface ExteriorPart {
  mesh: string; name: string; system: SystemCode; source: string; rule?: Omit<IslandRule, "name">; explode: V;
}

const box = (min: V, max: V) => ({ box: { min, max } });
const at = (...centres: V[]) => ({ centres });
// Demo directions: sides move sideways, nose parts forward, tail parts back, top parts up.
const side = (x: number, d: number, y = 0.15): V => [Math.sign(x) * d, y, 0];
const fwd = (x: number, d: number): V => [x * 0.5, 0.1, -d];
const back = (x: number, d: number): V => [x * 0.5, 0.1, d];
const up = (d: number, z = 0): V => [0, d, z];

/** Disassembly order: small outer pieces first, then lamps and glass, then panels. */
export const EXTERIOR_PARTS: ExteriorPart[] = [
  { mesh: "ext_mirror_l", name: "Door mirror housing (left)", system: "EXT-BODY", source: "body", rule: at([-1.0, 0.83, -0.49]), explode: side(-1, 1.5, 0.35) },
  { mesh: "ext_mirror_r", name: "Door mirror housing (right)", system: "EXT-BODY", source: "body", rule: at([1.0, 0.83, -0.49]), explode: side(1, 1.5, 0.35) },
  { mesh: "ext_mirror_chrome_l", name: "Mirror chrome piece (left)", system: "EXT-TRIM", source: "chrome", rule: at([-1.04, 0.86, -0.42]), explode: side(-1, 1.85, 0.5) },
  { mesh: "ext_mirror_chrome_r", name: "Mirror chrome piece (right)", system: "EXT-TRIM", source: "chrome", rule: at([1.04, 0.86, -0.42]), explode: side(1, 1.85, 0.5) },
  { mesh: "wipers", name: "Wipers", system: "EXT-TRIM", source: "wipers", explode: up(1.3, -0.9) },
  { mesh: "ext_badge_wing_l", name: "Wing badge (left)", system: "EXT-TRIM", source: "yellow_trim", rule: at([-0.92, 0.74, -0.8]), explode: side(-1, 1.9, 0.3) },
  { mesh: "ext_badge_wing_r", name: "Wing badge (right)", system: "EXT-TRIM", source: "yellow_trim", rule: at([0.92, 0.74, -0.8]), explode: side(1, 1.9, 0.3) },
  { mesh: "ext_badge_surround_l", name: "Wing badge surround (left)", system: "EXT-TRIM", source: "chrome", rule: at([-0.92, 0.73, -0.8]), explode: side(-1, 1.65, 0.3) },
  { mesh: "ext_badge_surround_r", name: "Wing badge surround (right)", system: "EXT-TRIM", source: "chrome", rule: at([0.92, 0.73, -0.8]), explode: side(1, 1.65, 0.3) },
  { mesh: "ext_badge_front_surround", name: "Front badge surround", system: "EXT-TRIM", source: "chrome", rule: at([-0.01, 0.58, -2.09]), explode: fwd(0, 1.65) },
  { mesh: "ext_badge_front", name: "Front badge", system: "EXT-TRIM", source: "yellow_trim", rule: at([-0.01, 0.58, -2.09]), explode: fwd(0, 1.9) },
  { mesh: "ext_chrome_front", name: "Front lower chrome piece", system: "EXT-TRIM", source: "chrome", rule: at([0, 0.29, -2.2]), explode: [0, -0.2, -1.9] },
  { mesh: "ext_badge_rear", name: "Rear badge", system: "EXT-TRIM", source: "chrome", rule: at([0.01, 0.84, 2.19]), explode: back(0, 1.9) },
  { mesh: "ext_chrome_rear", name: "Rear chrome pieces", system: "EXT-TRIM", source: "chrome", rule: box([-0.25, 0.92, 1.85], [0.25, 0.97, 2.0]), explode: up(1.7, 0.8) },
  { mesh: "ext_side_trim_l", name: "Side chrome trim (left)", system: "EXT-TRIM", source: "chrome", rule: box([-0.96, 0.34, 0.8], [-0.89, 0.41, 1.0]), explode: side(-1, 1.7, -0.1) },
  { mesh: "ext_side_trim_r", name: "Side chrome trim (right)", system: "EXT-TRIM", source: "chrome", rule: box([0.89, 0.34, 0.8], [0.96, 0.41, 1.0]), explode: side(1, 1.7, -0.1) },
  { mesh: "ext_exhaust_tips", name: "Exhaust tips (×3)", system: "EXT-TRIM", source: "chrome", rule: box([-0.2, 0.35, 2.18], [0.2, 0.47, 2.3]), explode: [0, -0.25, 1.9] },
  { mesh: "ext_exhaust_inner", name: "Exhaust tip inner pieces (×3)", system: "EXT-TRIM", source: "plastic_gray", rule: box([-0.2, 0.35, 2.15], [0.2, 0.47, 2.3]), explode: [0, -0.25, 1.55] },

  { mesh: "ext_headlamp_lens_l", name: "Headlamp lens (left)", system: "EXT-GLASS", source: "glass", rule: at([-0.71, 0.67, -1.74]), explode: fwd(-0.71, 1.9) },
  { mesh: "ext_headlamp_lens_r", name: "Headlamp lens (right)", system: "EXT-GLASS", source: "glass", rule: at([0.71, 0.67, -1.74]), explode: fwd(0.71, 1.9) },
  { mesh: "ext_led_strip_l", name: "Headlamp LED strip (left)", system: "EXT-LIGHT", source: "leds", rule: box([-0.9, 0.6, -1.85], [-0.6, 0.85, -1.4]), explode: fwd(-0.8, 1.6) },
  { mesh: "ext_led_strip_r", name: "Headlamp LED strip (right)", system: "EXT-LIGHT", source: "leds", rule: box([0.6, 0.6, -1.85], [0.9, 0.85, -1.4]), explode: fwd(0.8, 1.6) },
  { mesh: "ext_headlamp_bezel_l", name: "Headlamp chrome bezel (left)", system: "EXT-LIGHT", source: "chrome", rule: at([-0.68, 0.61, -1.83]), explode: fwd(-0.68, 1.5) },
  { mesh: "ext_headlamp_bezel_r", name: "Headlamp chrome bezel (right)", system: "EXT-LIGHT", source: "chrome", rule: at([0.68, 0.61, -1.83]), explode: fwd(0.68, 1.5) },
  { mesh: "ext_projector_l", name: "Headlamp projector (left)", system: "EXT-LIGHT", source: "lights", rule: at([-0.68, 0.61, -1.85]), explode: fwd(-0.68, 1.35) },
  { mesh: "ext_projector_r", name: "Headlamp projector (right)", system: "EXT-LIGHT", source: "lights", rule: at([0.68, 0.61, -1.85]), explode: fwd(0.68, 1.35) },
  { mesh: "ext_headlamp_housing_l", name: "Headlamp housing (left)", system: "EXT-LIGHT", source: "plastic_gray", rule: at([-0.72, 0.67, -1.75], [-0.69, 0.6, -1.85]), explode: fwd(-0.72, 1.1) },
  { mesh: "ext_headlamp_housing_r", name: "Headlamp housing (right)", system: "EXT-LIGHT", source: "plastic_gray", rule: at([0.71, 0.67, -1.75], [0.68, 0.6, -1.85]), explode: fwd(0.72, 1.1) },
  { mesh: "ext_side_indicator_l", name: "Side indicator (left)", system: "EXT-LIGHT", source: "leds", rule: at([-0.95, 0.64, -0.78]), explode: side(-1, 2.2, 0.05) },
  { mesh: "ext_side_indicator_r", name: "Side indicator (right)", system: "EXT-LIGHT", source: "leds", rule: at([0.95, 0.64, -0.78]), explode: side(1, 2.2, 0.05) },
  { mesh: "ext_tail_lens_l", name: "Tail-lamp lens (left)", system: "EXT-GLASS", source: "glass", rule: box([-0.86, 0.8, 2.0], [-0.68, 0.96, 2.1]), explode: back(-0.77, 2.0) },
  { mesh: "ext_tail_lens_r", name: "Tail-lamp lens (right)", system: "EXT-GLASS", source: "glass", rule: box([0.68, 0.8, 2.0], [0.86, 0.96, 2.1]), explode: back(0.77, 2.0) },
  { mesh: "ext_tail_ring_l", name: "Tail-lamp chrome ring (left)", system: "EXT-TRIM", source: "chrome", rule: at([-0.77, 0.88, 2.04]), explode: back(-0.77, 1.75) },
  { mesh: "ext_tail_ring_r", name: "Tail-lamp chrome ring (right)", system: "EXT-TRIM", source: "chrome", rule: at([0.77, 0.88, 2.04]), explode: back(0.77, 1.75) },
  { mesh: "ext_tail_lamp_l", name: "Tail lamp (left)", system: "EXT-LIGHT", source: "lights_red", rule: at([-0.77, 0.88, 1.94]), explode: back(-0.77, 1.45) },
  { mesh: "ext_tail_lamp_r", name: "Tail lamp (right)", system: "EXT-LIGHT", source: "lights_red", rule: at([0.77, 0.88, 1.94]), explode: back(0.77, 1.45) },
  { mesh: "ext_lower_lamp_l", name: "Lower rear lamp (left)", system: "EXT-LIGHT", source: "lights_red", rule: box([-0.7, 0.4, 2.05], [-0.5, 0.5, 2.2]), explode: back(-0.6, 1.6) },
  { mesh: "ext_lower_lamp_r", name: "Lower rear lamp (right)", system: "EXT-LIGHT", source: "lights_red", rule: box([0.5, 0.4, 2.05], [0.7, 0.5, 2.2]), explode: back(0.6, 1.6) },
  { mesh: "ext_third_brake", name: "Third brake light", system: "EXT-LIGHT", source: "lights_red", rule: at([0, 0.95, 2.13]), explode: [0, 0.6, 1.7] },

  { mesh: "ext_windscreen", name: "Windscreen", system: "EXT-GLASS", source: "glass", rule: at([-0.01, 1.02, -0.71]), explode: up(1.9, -0.3) },
  { mesh: "ext_rear_window", name: "Rear window glass", system: "EXT-GLASS", source: "glass", rule: at([-0.01, 1.02, 0.57]), explode: up(1.8, 0.3) },
  { mesh: "ext_grille_front_l", name: "Front grille (left)", system: "EXT-GRILLE", source: "grills", rule: at([-0.5, 0.6, -1.98]), explode: fwd(-0.5, 1.5) },
  { mesh: "ext_grille_front_r", name: "Front grille (right)", system: "EXT-GRILLE", source: "grills", rule: at([0.49, 0.6, -1.98]), explode: fwd(0.5, 1.5) },
  { mesh: "ext_wing_vent_l", name: "Front wing vent (left)", system: "EXT-GRILLE", source: "grills", rule: at([-0.86, 0.63, -1.65]), explode: side(-1, 1.6, 0.4) },
  { mesh: "ext_wing_vent_r", name: "Front wing vent (right)", system: "EXT-GRILLE", source: "grills", rule: at([0.85, 0.63, -1.65]), explode: side(1, 1.6, 0.4) },
  { mesh: "ext_engine_vents_l", name: "Engine-cover vents (left)", system: "EXT-GRILLE", source: "grills", rule: box([-0.7, 0.88, 1.3], [-0.2, 1.0, 1.9]), explode: [-0.4, 1.9, 0.4] },
  { mesh: "ext_engine_vents_r", name: "Engine-cover vents (right)", system: "EXT-GRILLE", source: "grills", rule: box([0.2, 0.88, 1.3], [0.7, 1.0, 1.9]), explode: [0.4, 1.9, 0.4] },
  { mesh: "ext_grille_rear_upper_l", name: "Rear upper grille (left)", system: "EXT-GRILLE", source: "grills", rule: at([-0.59, 0.83, 2.08]), explode: back(-0.59, 1.3) },
  { mesh: "ext_grille_rear_upper_r", name: "Rear upper grille (right)", system: "EXT-GRILLE", source: "grills", rule: at([0.58, 0.83, 2.08]), explode: back(0.58, 1.3) },
  { mesh: "ext_grille_rear_lower_l", name: "Rear lower grille (left)", system: "EXT-GRILLE", source: "grills", rule: at([-0.46, 0.39, 2.12]), explode: back(-0.46, 1.3) },
  { mesh: "ext_grille_rear_lower_r", name: "Rear lower grille (right)", system: "EXT-GRILLE", source: "grills", rule: at([0.45, 0.39, 2.12]), explode: back(0.45, 1.3) },

  { mesh: "ext_door_l", name: "Door (left)", system: "EXT-BODY", source: "body", rule: at([-0.87, 0.58, -0.09]), explode: side(-1, 1.25) },
  { mesh: "ext_door_r", name: "Door (right)", system: "EXT-BODY", source: "body", rule: at([0.85, 0.58, -0.09]), explode: side(1, 1.25) },
  { mesh: "ext_side_piece_l", name: "Small side piece behind door (left)", system: "EXT-BODY", source: "body", rule: at([-0.92, 0.77, 0.43]), explode: side(-1, 1.6, 0.45) },
  { mesh: "ext_side_piece_r", name: "Small side piece behind door (right)", system: "EXT-BODY", source: "body", rule: at([0.92, 0.77, 0.43]), explode: side(1, 1.6, 0.45) },
  { mesh: "ext_bonnet", name: "Bonnet (front lid)", system: "EXT-BODY", source: "body", rule: at([0, 0.7, -1.51]), explode: up(1.2, -0.6) },
  { mesh: "ext_engine_cover", name: "Engine cover", system: "EXT-BODY", source: "body", rule: at([-0.01, 0.94, 1.71], [-0.01, 0.95, 1.27]), explode: up(1.3, 0.6) },
  { mesh: "ext_front_bumper", name: "Front bumper / nose", system: "EXT-BODY", source: "body", rule: at([0, 0.48, -1.77]), explode: [0, -0.1, -1.15] },
  { mesh: "ext_rear_bumper", name: "Rear bumper / tail", system: "EXT-BODY", source: "body", rule: at([0, 0.56, 1.99]), explode: [0, -0.1, 1.05] },
  { mesh: "ext_wing_l", name: "Front wing (left)", system: "EXT-BODY", source: "body", rule: at([-0.87, 0.54, -1.09]), explode: side(-1, 1.0, 0.1) },
  { mesh: "ext_wing_r", name: "Front wing (right)", system: "EXT-BODY", source: "body", rule: at([0.86, 0.54, -1.09]), explode: side(1, 1.0, 0.1) },
  { mesh: "ext_quarter_l", name: "Rear quarter panel (left)", system: "EXT-BODY", source: "body", rule: at([-0.74, 0.71, 1.23]), explode: side(-1, 1.0, 0.1) },
  { mesh: "ext_quarter_r", name: "Rear quarter panel (right)", system: "EXT-BODY", source: "body", rule: at([0.73, 0.71, 1.23]), explode: side(1, 1.0, 0.1) },
  { mesh: "ext_skirt_l", name: "Side skirt (left)", system: "EXT-BODY", source: "body", rule: at([-0.9, 0.33, 0.17], [-0.82, 0.32, 0.17]), explode: [-1.0, -0.35, 0] },
  { mesh: "ext_skirt_r", name: "Side skirt (right)", system: "EXT-BODY", source: "body", rule: at([0.9, 0.33, 0.17], [0.82, 0.18, 0.17], [0.8, 0.32, 0.17]), explode: [1.0, -0.35, 0] },
  { mesh: "ext_rear_deck", name: "Rear deck panel (behind seats)", system: "EXT-BODY", source: "body", rule: at([-0.01, 1.06, 1.0]), explode: up(1.0, 0.3) },
  { mesh: "ext_screen_frame", name: "Windscreen frame & A-pillars", system: "EXT-BODY", source: "body", rule: at([0, 1.02, -0.49]), explode: up(1.0, -0.4) },
];

/** Exterior components a parts explorer would expect but this model does not contain as separate geometry. */
export const EXTERIOR_MISSING: { component: string; note: string }[] = [
  { component: "Side windows (door glass)", note: "No door-glass geometry in the file (the windows appear to be modelled down or absent)." },
  { component: "Door handles", note: "Only a small unlabelled piece behind each door; not identifiable as a handle." },
  { component: "Mirror glass", note: "Not separate from the mirror housing." },
  { component: "Hinges, latches, seals", note: "Not modelled." },
  { component: "Roof / folding hard-top", note: "No separate roof panel; the area behind the seats is one panel." },
  { component: "Fuel filler flap, number-plate mounts, washer jets", note: "Not modelled as separate pieces." },
  { component: "Individual LED segments / bulbs", note: "Grouped per lamp; no bulb-level geometry." },
];
