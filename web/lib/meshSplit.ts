// Splits a mesh into separate meshes along its existing geometry "islands"
// (groups of triangles that share no vertices). No vertex or triangle is moved,
// added or removed and every new mesh keeps the original material, so the model
// looks identical when assembled; the pieces simply become individually selectable.
import * as THREE from "three";

export interface IslandRule {
  /** Name given to the new mesh. */
  name: string;
  /** World-space centres of the islands that make up this component (from the audit). */
  centres?: [number, number, number][];
  /** Or: every island whose centre falls inside this world-space box (for many small pieces). */
  box?: { min: [number, number, number]; max: [number, number, number] };
}

function matches(r: IslandRule, c: THREE.Vector3, tol: number): boolean {
  if (r.centres?.some((q) => Math.abs(q[0] - c.x) <= tol && Math.abs(q[1] - c.y) <= tol && Math.abs(q[2] - c.z) <= tol)) return true;
  const b = r.box;
  return Boolean(b && c.x >= b.min[0] && c.x <= b.max[0] && c.y >= b.min[1] && c.y <= b.max[1] && c.z >= b.min[2] && c.z <= b.max[2]);
}

export interface IslandInfo { centre: THREE.Vector3; size: THREE.Vector3; triangles: number[] }

/** Islands of an indexed or non-indexed geometry, with world-space bounding boxes. */
export function findIslands(geo: THREE.BufferGeometry, matrixWorld: THREE.Matrix4): IslandInfo[] {
  const pos = geo.getAttribute("position");
  const idx = geo.getIndex();
  const n = pos.count;
  // Weld vertices by position so seams split only by normals/UVs still count as connected.
  const weld = new Map<string, number>();
  const id = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let v = weld.get(k);
    if (v === undefined) { v = weld.size; weld.set(k, v); }
    id[i] = v;
  }
  const parent = new Int32Array(weld.size).map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const vert = (t: number) => (idx ? idx.getX(t) : t);
  const triCount = (idx ? idx.count : n) / 3;
  for (let t = 0; t < triCount; t++) {
    const a = find(id[vert(t * 3)]), b = find(id[vert(t * 3 + 1)]), c = find(id[vert(t * 3 + 2)]);
    parent[a] = b; parent[find(b)] = find(c);
  }
  const byRoot = new Map<number, { box: THREE.Box3; triangles: number[] }>();
  const p = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    const root = find(id[vert(t * 3)]);
    let e = byRoot.get(root);
    if (!e) { e = { box: new THREE.Box3(), triangles: [] }; byRoot.set(root, e); }
    e.triangles.push(t);
    for (let k = 0; k < 3; k++) e.box.expandByPoint(p.fromBufferAttribute(pos, vert(t * 3 + k)).applyMatrix4(matrixWorld));
  }
  return [...byRoot.values()].map((e) => ({ centre: e.box.getCenter(new THREE.Vector3()), size: e.box.getSize(new THREE.Vector3()), triangles: e.triangles }));
}

/** New geometry holding only the given triangles (all attributes copied verbatim). */
export function subGeometry(geo: THREE.BufferGeometry, triangles: number[]): THREE.BufferGeometry {
  const idx = geo.getIndex();
  const remap = new Map<number, number>();
  const order: number[] = [];
  const out: number[] = [];
  for (const t of triangles) {
    for (let k = 0; k < 3; k++) {
      const v = idx ? idx.getX(t * 3 + k) : t * 3 + k;
      let m = remap.get(v);
      if (m === undefined) { m = order.length; remap.set(v, m); order.push(v); }
      out.push(m);
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    const a = attr as THREE.BufferAttribute;
    const arr = new (a.array.constructor as new (len: number) => THREE.TypedArray)(order.length * a.itemSize);
    order.forEach((v, i) => { for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.array[v * a.itemSize + c]; });
    g.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
  }
  g.setIndex(out);
  return g;
}

export interface SplitResult { made: { name: string; islands: number; triangles: number }[]; rest: number }

/**
 * Replace `mesh` by one mesh per rule (islands whose centre lies within `tol` of a
 * rule centre). Islands that match no rule stay together in `<name>_rest`.
 */
export function splitByIslands(mesh: THREE.Mesh, rules: IslandRule[], tol = 0.035): SplitResult {
  const parent = mesh.parent;
  if (!parent) return { made: [], rest: 0 };
  mesh.updateMatrixWorld(true);
  const islands = findIslands(mesh.geometry, mesh.matrixWorld);
  const buckets = new Map<string, IslandInfo[]>();
  const rest: IslandInfo[] = [];
  for (const isl of islands) {
    const rule = rules.find((r) => matches(r, isl.centre, tol));
    if (rule) { const b = buckets.get(rule.name) ?? []; b.push(isl); buckets.set(rule.name, b); } else rest.push(isl);
  }
  const add = (name: string, list: IslandInfo[]) => {
    const tris = list.flatMap((i) => i.triangles).sort((a, b) => a - b);
    const m = new THREE.Mesh(subGeometry(mesh.geometry, tris), mesh.material);
    m.name = name;
    m.position.copy(mesh.position); m.quaternion.copy(mesh.quaternion); m.scale.copy(mesh.scale);
    m.userData = { sourceMesh: mesh.name, islands: list.length, triangles: tris.length };
    parent.add(m);
    return { name, islands: list.length, triangles: tris.length };
  };
  const made = [...buckets].map(([name, list]) => add(name, list));
  if (rest.length) add(`${mesh.name}_rest`, rest);
  parent.remove(mesh);
  mesh.geometry.dispose();
  return { made, rest: rest.length };
}
