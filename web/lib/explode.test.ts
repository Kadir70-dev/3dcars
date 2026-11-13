import { describe, expect, it } from "vitest";
import { codeForMesh, explodeTargets, lerpVec, meshesForCode, missingMeshes } from "./explode";
import type { MeshBinding } from "./api";

const bindings: MeshBinding[] = [
  { meshName: "wheel_fl", assemblyCode: "0042", partId: null, explode: [0, 0, 0.4] },
  { meshName: "wheel_fr", assemblyCode: "0042", partId: null, explode: null },
  { meshName: "gone", assemblyCode: "0019", partId: null, explode: [1, 0, 0] },
];

describe("explode helpers", () => {
  it("uses recorded offsets and leaves unknown meshes in place", () => {
    const t = explodeTargets(bindings, ["wheel_fl", "wheel_fr", "body"]);
    expect(t.get("wheel_fl")).toEqual([0, 0, 0.4]);
    expect(t.get("wheel_fr")).toEqual([0, 0, 0]);
    expect(t.get("body")).toEqual([0, 0, 0]);
  });
  it("maps meshes to assembly codes", () => {
    expect(codeForMesh(bindings, "wheel_fr")).toBe("0042");
    expect(codeForMesh(bindings, "body")).toBeNull();
    expect([...meshesForCode(bindings, "0042")]).toEqual(["wheel_fl", "wheel_fr"]);
    expect(meshesForCode(bindings, null).size).toBe(0);
  });
  it("reports bindings whose mesh is absent from the model", () => {
    expect(missingMeshes(bindings, ["wheel_fl", "wheel_fr"])).toEqual(["gone"]);
  });
  it("clamps interpolation", () => {
    expect(lerpVec([0, 0, 0], [2, 4, 6], 0.5)).toEqual([1, 2, 3]);
    expect(lerpVec([0, 0, 0], [2, 4, 6], 3)).toEqual([2, 4, 6]);
  });
});
