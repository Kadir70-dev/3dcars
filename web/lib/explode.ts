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

/** What the visitor has selected: an assembly, optionally narrowed to one part. */
export interface Selection { code: string | null; partId: number | null }

/** Meshes to highlight: the part's own meshes when a bound part is chosen, else the assembly's. */
export function meshesForSelection(bindings: MeshBinding[], sel: Selection): Set<string> {
  if (sel.partId !== null) {
    const own = bindings.filter((b) => b.partId === sel.partId).map((b) => b.meshName);
    if (own.length) return new Set(own);
  }
  return meshesForCode(bindings, sel.code);
}

/** Selection implied by clicking a mesh, or null when the mesh is unbound. */
export function selectionForMesh(bindings: MeshBinding[], meshName: string): Selection | null {
  const b = bindings.find((x) => x.meshName === meshName);
  if (!b || (b.assemblyCode === null && b.partId === null)) return null;
  return { code: b.assemblyCode, partId: b.partId };
}

/**
 * Ordered disassembly steps recorded for the asset. Meshes without a recorded
 * step move together in one final step, so nothing is silently reordered.
 */
export function explodeSteps(bindings: MeshBinding[]): number[] {
  const moving = bindings.filter((b) => b.explode);
  const steps = [...new Set(moving.map((b) => b.explodeStep).filter((s): s is number => typeof s === "number"))].sort((a, b) => a - b);
  if (moving.some((b) => typeof b.explodeStep !== "number")) steps.push(steps.length ? steps[steps.length - 1] + 1 : 1);
  return steps;
}

/**
 * Meshes that should be pulled out. `level` is how many steps are applied
 * (0 = assembled). With `only`, the explode is limited to those meshes.
 */
export function explodedMeshes(bindings: MeshBinding[], level: number, only: Set<string> | null): Set<string> {
  const steps = explodeSteps(bindings);
  if (level <= 0 || steps.length === 0) return new Set();
  const finalStep = steps[steps.length - 1];
  const limit = steps[Math.min(level, steps.length) - 1];
  return new Set(
    bindings
      .filter((b) => b.explode && (b.explodeStep ?? finalStep) <= limit && (!only || only.has(b.meshName)))
      .map((b) => b.meshName),
  );
}

/** Meshes that move in the given step (1-based); unordered meshes belong to the final step. */
export function meshesAtStep(bindings: MeshBinding[], level: number): Set<string> {
  const steps = explodeSteps(bindings);
  if (level <= 0 || level > steps.length) return new Set();
  const step = steps[level - 1], finalStep = steps[steps.length - 1];
  return new Set(bindings.filter((b) => b.explode && (b.explodeStep ?? finalStep) === step).map((b) => b.meshName));
}
