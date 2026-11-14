// Abstract pipeline-test fixture: plain boxes, cylinders and rings with names,
// used to exercise the 3D workbench (select, sync, isolate, hide, step-by-step
// explode) without any licensed asset. It is deliberately NOT car-shaped, its
// "parts" are test labels with no OEM meaning, and it is never shown as a vehicle.
import * as THREE from "three";
import type { MeshBinding } from "./api";

export interface FixturePart { id: number; name: string; meshName: string; system?: string }
export interface FixtureGroup { code: string; name: string; parts: FixturePart[] }

export const FIXTURE_GROUPS: FixtureGroup[] = [
  { code: "FX-1", name: "Test cover group", parts: [
    { id: 1, name: "Test cover panel", meshName: "fixture_shell" },
    { id: 2, name: "Test cover cap", meshName: "fixture_cap" },
  ] },
  { code: "FX-2", name: "Test ring group", parts: [
    { id: 3, name: "Test ring A", meshName: "fixture_ring_a" },
    { id: 4, name: "Test ring B", meshName: "fixture_ring_b" },
    { id: 5, name: "Test ring C", meshName: "fixture_ring_c" },
    { id: 6, name: "Test ring D", meshName: "fixture_ring_d" },
  ] },
  { code: "FX-3", name: "Test core group", parts: [
    { id: 7, name: "Test core block", meshName: "fixture_core" },
    { id: 8, name: "Test core rod", meshName: "fixture_rod" },
  ] },
  { code: "FX-4", name: "Test base group", parts: [
    { id: 9, name: "Test base plate", meshName: "fixture_plate" },
  ] },
];

const OFFSETS: Record<string, { explode: [number, number, number]; step: number | null }> = {
  fixture_shell: { explode: [0, 1.0, 0], step: 1 },
  fixture_cap: { explode: [0, 1.5, 0], step: 1 },
  fixture_ring_a: { explode: [-0.7, 0, 0.6], step: 2 },
  fixture_ring_b: { explode: [0.7, 0, 0.6], step: 2 },
  fixture_ring_c: { explode: [-0.7, 0, -0.6], step: 2 },
  fixture_ring_d: { explode: [0.7, 0, -0.6], step: 2 },
  fixture_rod: { explode: [0, 0.55, 0], step: 3 },
  fixture_core: { explode: [0, 0.25, 0], step: null },
  fixture_plate: { explode: [0, -0.5, 0], step: 3 },
};

export const FIXTURE_BINDINGS: MeshBinding[] = FIXTURE_GROUPS.flatMap((g) =>
  g.parts.map((p) => ({ meshName: p.meshName, assemblyCode: g.code, partId: p.id, explode: OFFSETS[p.meshName].explode, explodeStep: OFFSETS[p.meshName].step })),
);

export function buildFixture(): THREE.Object3D {
  const g = new THREE.Group();
  const mat = (c: string) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.4, roughness: 0.45 });
  const add = (name: string, geo: THREE.BufferGeometry, color: string, pos: [number, number, number], rot?: [number, number, number]) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.name = name;
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    g.add(m);
  };
  const ring = () => new THREE.TorusGeometry(0.24, 0.07, 16, 40);
  add("fixture_plate", new THREE.BoxGeometry(2.4, 0.08, 1.6), "#3a4143", [0, 0, 0]);
  add("fixture_core", new THREE.BoxGeometry(0.9, 0.45, 0.7), "#8b9690", [0, 0.28, 0]);
  add("fixture_rod", new THREE.CylinderGeometry(0.05, 0.05, 1.7, 20), "#6f7774", [0, 0.3, 0], [Math.PI / 2, 0, 0]);
  add("fixture_shell", new THREE.BoxGeometry(1.8, 0.22, 1.2), "#b8343a", [0, 0.66, 0]);
  add("fixture_cap", new THREE.CylinderGeometry(0.22, 0.26, 0.14, 32), "#d8b36b", [0, 0.84, 0]);
  add("fixture_ring_a", ring(), "#c9cfcb", [-0.8, 0.3, 0.82]);
  add("fixture_ring_b", ring(), "#c9cfcb", [0.8, 0.3, 0.82]);
  add("fixture_ring_c", ring(), "#c9cfcb", [-0.8, 0.3, -0.82]);
  add("fixture_ring_d", ring(), "#c9cfcb", [0.8, 0.3, -0.82]);
  return g;
}
