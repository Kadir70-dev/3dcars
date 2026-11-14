import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildEngineConcept, ENGINE_BINDINGS, ENGINE_GROUPS } from "./engineDemo";
import { explodeSteps, explodedMeshes } from "./explode";

describe("procedural V8 engine concept", () => {
  const scene = buildEngineConcept();
  const names = new Set<string>();
  scene.traverse((o) => names.add(o.name));

  it("binds every listed component to a node that exists in the built scene", () => {
    const bound = ENGINE_BINDINGS.map((b) => b.meshName);
    expect(new Set(bound).size).toBe(bound.length);
    bound.forEach((n) => expect(names.has(n)).toBe(true));
    expect(ENGINE_GROUPS[0].parts).toHaveLength(ENGINE_BINDINGS.length);
  });

  it("gives every bound node real geometry", () => {
    for (const b of ENGINE_BINDINGS) {
      let meshes = 0;
      scene.getObjectByName(b.meshName)!.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
      expect(meshes).toBeGreaterThan(0);
    }
  });

  it("keeps the block in place and takes everything else apart step by step", () => {
    const all = explodedMeshes(ENGINE_BINDINGS, explodeSteps(ENGINE_BINDINGS).length, null);
    expect(all.has("engine_core")).toBe(false);
    expect(all.size).toBe(ENGINE_BINDINGS.length - 1);
  });

  it("makes no OEM claims: no part numbers in names and an explicit concept label", () => {
    expect(ENGINE_GROUPS[0].parts.every((p) => !/\d{4,}/.test(p.name))).toBe(true);
    expect(ENGINE_GROUPS[0].name.toLowerCase()).toContain("illustrative");
  });
});
