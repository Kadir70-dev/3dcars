// Small three.js helpers shared by the 3D viewers.
import * as THREE from "three";
import type { Vec3 } from "./explode";

/** Explode offsets are recorded in model (world) space; convert to each node's parent space. */
export function toParentSpace(bound: Map<string, THREE.Object3D>, world: Map<string, Vec3>): Map<string, Vec3> {
  const out = new Map<string, Vec3>();
  for (const [name, o] of bound) {
    const off = world.get(name) ?? [0, 0, 0];
    if (!o.parent || (off[0] === 0 && off[1] === 0 && off[2] === 0)) { out.set(name, off); continue; }
    const wp = o.getWorldPosition(new THREE.Vector3());
    const a = o.parent.worldToLocal(wp.clone());
    const b = o.parent.worldToLocal(wp.clone().add(new THREE.Vector3(...off)));
    out.set(name, [b.x - a.x, b.y - a.y, b.z - a.z]);
  }
  return out;
}
