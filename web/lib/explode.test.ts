import { describe, expect, it } from "vitest";
import { codeForMesh, explodedMeshes, meshesAtStep, explodeSteps, explodeTargets, lerpVec, meshesForCode, meshesForSelection, missingMeshes, selectionForMesh } from "./explode";
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

describe("selection and steps", () => {
  const stepped: MeshBinding[] = [
    { meshName: "hood", assemblyCode: "A", partId: 10, explode: [0, 1, 0], explodeStep: 1 },
    { meshName: "wheel_l", assemblyCode: "B", partId: 20, explode: [-1, 0, 0], explodeStep: 2 },
    { meshName: "wheel_r", assemblyCode: "B", partId: 21, explode: [1, 0, 0], explodeStep: 2 },
    { meshName: "seat", assemblyCode: "C", partId: null, explode: [0, 0.5, 0] },
    { meshName: "chassis", assemblyCode: "D", partId: null, explode: null },
    { meshName: "badge", assemblyCode: null, partId: null, explode: null },
  ];
  it("highlights a bound part, falling back to its assembly", () => {
    expect([...meshesForSelection(stepped, { code: "B", partId: 21 })]).toEqual(["wheel_r"]);
    expect([...meshesForSelection(stepped, { code: "B", partId: 99 })]).toEqual(["wheel_l", "wheel_r"]);
    expect(meshesForSelection(stepped, { code: null, partId: null }).size).toBe(0);
  });
  it("maps a clicked mesh back to its listing", () => {
    expect(selectionForMesh(stepped, "wheel_l")).toEqual({ code: "B", partId: 20 });
    expect(selectionForMesh(stepped, "badge")).toBeNull();
    expect(selectionForMesh(stepped, "unknown")).toBeNull();
  });
  it("orders steps and puts unordered meshes last", () => {
    expect(explodeSteps(stepped)).toEqual([1, 2, 3]);
    expect([...explodedMeshes(stepped, 0, null)]).toEqual([]);
    expect([...explodedMeshes(stepped, 1, null)]).toEqual(["hood"]);
    expect([...explodedMeshes(stepped, 2, null)]).toEqual(["hood", "wheel_l", "wheel_r"]);
    expect([...explodedMeshes(stepped, 9, null)]).toEqual(["hood", "wheel_l", "wheel_r", "seat"]);
  });
  it("lists the meshes of one step", () => {
    expect([...meshesAtStep(stepped, 2)]).toEqual(["wheel_l", "wheel_r"]);
    expect([...meshesAtStep(stepped, 3)]).toEqual(["seat"]);
    expect(meshesAtStep(stepped, 0).size).toBe(0);
    expect(meshesAtStep(stepped, 4).size).toBe(0);
  });
  it("limits the explode to the selection", () => {
    expect([...explodedMeshes(stepped, 3, new Set(["wheel_l", "wheel_r"]))]).toEqual(["wheel_l", "wheel_r"]);
    expect(explodeSteps([])).toEqual([]);
  });
});
