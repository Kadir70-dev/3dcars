import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { findIslands, splitByIslands } from "./meshSplit";

// Two separate quads (4 triangles) plus one lone triangle: three islands.
function sample(): THREE.Mesh {
  const quad = (x: number) => [x, 0, 0, x + 1, 0, 0, x + 1, 1, 0, x, 0, 0, x + 1, 1, 0, x, 1, 0];
  const pos = new Float32Array([...quad(0), ...quad(5), 10, 0, 0, 11, 0, 0, 10, 1, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2).map((_, i) => i), 2));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ name: "paint" }));
  m.name = "body";
  new THREE.Group().add(m);
  return m;
}

describe("mesh island split", () => {
  it("finds islands even when seam vertices are duplicated", () => {
    const m = sample();
    const isl = findIslands(m.geometry, m.matrixWorld);
    expect(isl.map((i) => i.triangles.length).sort()).toEqual([1, 2, 2]);
  });

  it("splits by rule, keeps material and every triangle, and collects the rest", () => {
    const m = sample();
    const parent = m.parent!;
    const material = m.material;
    const res = splitByIslands(m, [
      { name: "left_panel", centres: [[0.5, 0.5, 0]] },
      { name: "right_panel", box: { min: [5, 0, -1], max: [6, 1, 1] } },
    ], 0.01);
    expect(res.made.map((x) => x.name)).toEqual(["left_panel", "right_panel"]);
    expect(res.rest).toBe(1);
    const names = parent.children.map((c) => c.name).sort();
    expect(names).toEqual(["body_rest", "left_panel", "right_panel"]);
    const parts = parent.children as THREE.Mesh[];
    expect(parts.every((p) => p.material === material)).toBe(true);
    const tris = parts.reduce((s, p) => s + p.geometry.getIndex()!.count / 3, 0);
    expect(tris).toBe(5);
    const left = parts.find((p) => p.name === "left_panel")!;
    const box = new THREE.Box3().setFromBufferAttribute(left.geometry.getAttribute("position") as THREE.BufferAttribute);
    expect(box.min.toArray()).toEqual([0, 0, 0]);
    expect(box.max.toArray()).toEqual([1, 1, 0]);
    expect(left.geometry.getAttribute("uv")).toBeDefined();
    expect(left.userData).toMatchObject({ sourceMesh: "body", islands: 1, triangles: 2 });
  });
});
