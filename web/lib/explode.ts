// Pure helpers for the 3D viewer. Offsets come only from asset bindings —
// meshes without recorded offsets stay in place (no invented geometry).
import type { MeshBinding } from "./api";

export type Vec3 = [number, number, number];

export function explodeTargets(bindings: MeshBinding[], meshNames: string[]): Map<string, Vec3> {
  const byName = new Map(bindings.map((b) => [b.meshName, b]));
  const out = new Map<string, Vec3>();
  for (const name of meshNames) {
    out.set(name, byName.get(name)?.explode ?? [0, 0, 0]);
  }
  return out;
}

/** Assembly code a mesh belongs to, or null when the mesh is unbound. */
export function codeForMesh(bindings: MeshBinding[], meshName: string): string | null {
  return bindings.find((b) => b.meshName === meshName)?.assemblyCode ?? null;
}

export function meshesForCode(bindings: MeshBinding[], code: string | null): Set<string> {
  return new Set(code ? bindings.filter((b) => b.assemblyCode === code).map((b) => b.meshName) : []);
}

/** Bound meshes that are missing from the loaded model — surfaced to admins. */
export function missingMeshes(bindings: MeshBinding[], meshNames: string[]): string[] {
  const present = new Set(meshNames);
  return bindings.map((b) => b.meshName).filter((n) => !present.has(n));
}

export function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
