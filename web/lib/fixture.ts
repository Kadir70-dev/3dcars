// Abstract pipeline-test fixture: plain boxes and cylinders with names, used to
// exercise the 3D viewer (rotate, zoom, select, explode) without any licensed
// asset. It is deliberately NOT car-shaped and is never shown as a vehicle.
import * as THREE from "three";
import type { MeshBinding } from "./api";

export const FIXTURE_BINDINGS: MeshBinding[] = [
  { meshName: "fixture_shell", assemblyCode: "FX-1", partId: null, explode: [0, 0.9, 0] },
  { meshName: "fixture_core", assemblyCode: "FX-2", partId: null, explode: [0, 0, 0] },
  { meshName: "fixture_ring_a", assemblyCode: "FX-3", partId: null, explode: [-0.9, 0, 0.7] },
  { meshName: "fixture_ring_b", assemblyCode: "FX-3", partId: null, explode: [0.9, 0, 0.7] },
  { meshName: "fixture_plate", assemblyCode: "FX-4", partId: null, explode: [0, -0.6, 0] },
];

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
  add("fixture_plate", new THREE.BoxGeometry(2.4, 0.08, 1.4), "#3a4143", [0, 0, 0]);
  add("fixture_core", new THREE.BoxGeometry(0.9, 0.5, 0.7), "#8b9690", [0, 0.3, 0]);
  add("fixture_shell", new THREE.BoxGeometry(1.8, 0.25, 1.1), "#b8343a", [0, 0.7, 0]);
  add("fixture_ring_a", new THREE.TorusGeometry(0.28, 0.07, 16, 40), "#c9cfcb", [-0.8, 0.3, 0.75]);
  add("fixture_ring_b", new THREE.TorusGeometry(0.28, 0.07, 16, 40), "#c9cfcb", [0.8, 0.3, 0.75]);
  return g;
}
