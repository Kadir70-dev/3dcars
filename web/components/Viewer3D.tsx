"use client";
// WebGL viewer for a licensed vehicle model. Hotspots and exploded offsets come
// only from asset_mesh_bindings; unbound meshes are never labelled or moved.
// All selection/visibility state is owned by the parent so the model and the
// parts list stay in sync.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { MeshBinding } from "@/lib/api";
import { easeInOut, explodeTargets, missingMeshes, type Vec3 } from "@/lib/explode";
import { LabelLayer, type LabelState } from "./viewerLabels";

/** `tune` may adjust materials and make duplicate node names unique; it must not move geometry. */
export type ModelSource =
  | { type: "url"; url: string; tune?: (root: THREE.Object3D) => void }
  | { type: "scene"; build: () => THREE.Object3D };

interface Props {
  source: ModelSource;
  bindings: MeshBinding[];
  label: string;
  highlighted: Set<string>;
  exploded: Set<string>;
  hidden: Set<string>;
  isolate: boolean;
  onPickMesh: (meshName: string) => void;
  /** Increment to frame the highlighted meshes. */
  focusNonce: number;
  /** Increment to return the camera to its starting view. */
  resetNonce: number;
  /** Optional name labels per mesh, shown next to pulled-out parts. */
  labels?: Record<string, string>;
  /** Meshes whose labels show at full size (e.g. the current disassembly step). */
  labelFocus?: Set<string>;
  showAllLabels?: boolean;
  /** Called when a part starts moving out, so the list can follow along. */
  onMoving?: (meshName: string) => void;
}

const GAP_MS = 380;
const MOVE_MS = 700;

interface MatState { mat: THREE.Material; opacity: number; transparent: boolean; depthWrite: boolean }
interface CamTween { fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; t: number }

interface Runtime {
  bound: Map<string, THREE.Object3D>;
  base: Map<string, THREE.Vector3>;
  targets: Map<string, Vec3>;
  t: Map<string, number>;
  want: Map<string, 0 | 1>;
  /** Every mesh, with the name of its bound ancestor (null if unbound). */
  meshes: { mesh: THREE.Mesh; owner: string | null; mats: MatState[] }[];
  camera: THREE.PerspectiveCamera; controls: OrbitControls;
  home: { pos: THREE.Vector3; target: THREE.Vector3 };
  tween: CamTween | null;
  size: number;
  /** When each part may start moving (staggered one by one). */
  startAt: Map<string, number>;
  rest: Map<string, THREE.Vector3>;
  worldOff: Map<string, THREE.Vector3>;
  offNow: Map<string, THREE.Vector3>;
  labels: LabelLayer | null;
  hover: string | null;
}

const HIGHLIGHT = new THREE.Color("#d8b36b");
const BLACK = new THREE.Color(0);
const GHOST_OPACITY = 0.08;

export default function Viewer3D(props: Props) {
  const { source, bindings, label, highlighted, exploded, hidden, isolate, onPickMesh, focusNonce, resetNonce } = props;
  const look = useRef<{ s: LabelState; lit: Set<string>; hidden: Set<string> }>({ s: { focus: new Set(), showAll: false, hover: null }, lit: new Set(), hidden: new Set() });
  const labelsRef = useRef(props.labels);
  const movingRef = useRef(props.onMoving);
  const host = useRef<HTMLDivElement>(null);
  const rt = useRef<Runtime | null>(null);
  const pickRef = useRef(onPickMesh);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => { pickRef.current = onPickMesh; movingRef.current = props.onMoving; }, [onPickMesh, props.onMoving]);
  useEffect(() => {
    look.current = { s: { focus: props.labelFocus ?? new Set(), showAll: Boolean(props.showAllLabels), hover: rt.current?.hover ?? null }, lit: highlighted, hidden };
  }, [props.labelFocus, props.showAllLabels, highlighted, hidden]);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 6, 3);
    scene.add(key, new THREE.HemisphereLight(0xffffff, 0x202020, 0.4));

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let disposed = false;
    let raf = 0;
    const names = new Set(bindings.map((b) => b.meshName));

    const mount = (root: THREE.Object3D) => {
      if (disposed) return;
      if (source.type === "url") source.tune?.(root);
      root.updateMatrixWorld(true);
      const bound = new Map<string, THREE.Object3D>();
      const all: string[] = [];
      root.traverse((o) => {
        if (o.name) all.push(o.name);
        if (names.has(o.name) && !bound.has(o.name)) bound.set(o.name, o);
      });
      const meshes: Runtime["meshes"] = [];
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
        let owner: string | null = null;
        for (let p: THREE.Object3D | null = m; p && !owner; p = p.parent) if (bound.get(p.name) === p) owner = p.name;
        const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => ({ mat, opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite }));
        meshes.push({ mesh: m, owner, mats });
      });
      scene.add(root);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      camera.near = size / 100;
      camera.far = size * 20;
      camera.position.copy(center).add(new THREE.Vector3(size * 0.78, size * 0.38, size * 0.92));
      controls.target.copy(center);
      controls.minDistance = size * 0.2;
      controls.maxDistance = size * 3;
      camera.updateProjectionMatrix();
      const worldTargets = explodeTargets(bindings, [...bound.keys()]);
      const lbl = labelsRef.current;
      rt.current = {
        startAt: new Map(),
        rest: new Map([...bound].map(([n, o]) => [n, new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())])),
        worldOff: new Map([...worldTargets].map(([n, v]) => [n, new THREE.Vector3(...v)])),
        offNow: new Map([...bound.keys()].map((n) => [n, new THREE.Vector3()])),
        labels: lbl ? new LabelLayer(el, lbl, bound.keys(), (n) => pickRef.current(n)) : null,
        hover: null,
        bound, meshes,
        base: new Map([...bound].map(([n, o]) => [n, o.position.clone()])),
        targets: toParentSpace(bound, worldTargets),
        t: new Map([...bound.keys()].map((n) => [n, 0])),
        want: new Map([...bound.keys()].map((n) => [n, 0])),
        camera, controls, home: { pos: camera.position.clone(), target: center.clone() },
        tween: null, size,
      };
      setMissing(missingMeshes(bindings, all));
      setState("ready");
    };

    if (source.type === "scene") {
      mount(source.build());
    } else {
      // Draco decoder is served locally from /draco (copied from three/examples, Apache-2.0).
      const draco = new DRACOLoader().setDecoderPath("/draco/");
      new GLTFLoader().setDRACOLoader(draco).load(source.url, (g) => { draco.dispose(); mount(g.scene); }, undefined,
        () => { draco.dispose(); if (!disposed) setState("error"); });
    }

    // Click (not drag) picks the bound ancestor of the nearest visible, non-ghosted hit.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      const r = rt.current;
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || !r) return;
      const box = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1), camera);
      const byMesh = new Map(r.meshes.map((m) => [m.mesh, m]));
      for (const hit of ray.intersectObjects(scene.children, true)) {
        const info = byMesh.get(hit.object as THREE.Mesh);
        if (!info || !isShown(info.mesh) || info.mats[0]?.mat.opacity <= GHOST_OPACITY) continue;
        if (info.owner) pickRef.current(info.owner);
        return;
      }
    };
    // Hover shows the name of the part under the pointer (one raycast per frame at most).
    let hoverAt: THREE.Vector2 | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.buttons || e.pointerType !== "mouse") { hoverAt = null; return; }
      const box = renderer.domElement.getBoundingClientRect();
      hoverAt = new THREE.Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    };
    const onLeave = () => { hoverAt = null; if (rt.current) rt.current.hover = null; };
    const hoverPick = (r: Runtime, at: THREE.Vector2) => {
      ray.setFromCamera(at, camera);
      const byMesh = new Map(r.meshes.map((m) => [m.mesh, m]));
      r.hover = null;
      for (const hit of ray.intersectObjects(scene.children, true)) {
        const info = byMesh.get(hit.object as THREE.Mesh);
        if (!info || !isShown(info.mesh) || info.mats[0]?.mat.opacity <= GHOST_OPACITY) continue;
        r.hover = info.owner;
        break;
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const r = rt.current;
      if (r) {
        const step = reduce ? 1 : dt / MOVE_MS;
        for (const [n, o] of r.bound) {
          const cur = r.t.get(n)!, goal = r.want.get(n)!;
          if (cur === goal || now < (r.startAt.get(n) ?? 0)) continue;
          if (cur === 0 && goal === 1) movingRef.current?.(n);
          const next = goal > cur ? Math.min(goal, cur + step) : Math.max(goal, cur - step);
          r.t.set(n, next);
          const b = r.base.get(n)!, off = r.targets.get(n)!, k = easeInOut(next);
          o.position.set(b.x + off[0] * k, b.y + off[1] * k, b.z + off[2] * k);
          r.offNow.get(n)!.copy(r.worldOff.get(n) ?? new THREE.Vector3()).multiplyScalar(k);
        }
        if (hoverAt) hoverPick(r, hoverAt);
        if (r.labels) {
          const L = look.current, size = renderer.getSize(new THREE.Vector2());
          r.labels.update(camera, size.x, size.y, r.rest, r.offNow, r.t, (n) => !L.hidden.has(n),
            { ...L.s, hover: r.hover }, L.lit);
        }
        if (r.tween) {
          const tw = r.tween;
          tw.t = Math.min(1, tw.t + (reduce ? 1 : dt / 600));
          const k = easeInOut(tw.t);
          camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
          controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
          if (tw.t >= 1) r.tween = null;
        }
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      rt.current?.labels?.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        }
      });
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      rt.current = null;
    };
  }, [source, bindings]);

  // Explode targets per mesh.
  useEffect(() => {
    const r = rt.current;
    if (!r) return;
    // Parts move one by one in binding order (reverse order when going back together).
    const now = performance.now();
    const order = bindings.map((b) => b.meshName).filter((n) => r.bound.has(n));
    const out = order.filter((n) => exploded.has(n) && r.want.get(n) !== 1);
    const back = order.filter((n) => !exploded.has(n) && r.want.get(n) !== 0).reverse();
    const gap = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GAP_MS;
    out.forEach((n, i) => { r.want.set(n, 1); r.startAt.set(n, now + i * gap); });
    back.forEach((n, i) => { r.want.set(n, 0); r.startAt.set(n, now + i * gap * 0.35); });
    // Pull the camera back while parts are out so they stay in frame; return when reassembled.
    const wasOut = [...r.want.values()].some((v) => v === 1) && out.length === [...r.want.values()].filter((v) => v === 1).length;
    if (wasOut && order.length) {
      const dir = r.camera.position.clone().sub(r.controls.target);
      r.tween = { fromPos: r.camera.position.clone(), toPos: r.controls.target.clone().add(dir.multiplyScalar(1.55)), fromTarget: r.controls.target.clone(), toTarget: r.controls.target.clone(), t: 0 };
    } else if (exploded.size === 0 && back.length) {
      r.tween = { fromPos: r.camera.position.clone(), toPos: r.home.pos.clone(), fromTarget: r.controls.target.clone(), toTarget: r.home.target.clone(), t: 0 };
    }
  }, [exploded, state, bindings]);

  // Highlight, isolate (ghost everything else) and hide.
  useEffect(() => {
    if (rt.current) applyLook(rt.current, highlighted, hidden, isolate);
  }, [highlighted, hidden, isolate, state]);

  const tweenTo = (pos: THREE.Vector3, target: THREE.Vector3) => {
    const r = rt.current;
    if (!r) return;
    r.tween = { fromPos: r.camera.position.clone(), toPos: pos, fromTarget: r.controls.target.clone(), toTarget: target, t: 0 };
  };

  // Frame the highlighted meshes, keeping the current viewing direction.
  useEffect(() => {
    const r = rt.current;
    if (!r || focusNonce === 0) return;
    const box = new THREE.Box3();
    for (const n of highlighted) { const o = r.bound.get(n); if (o?.visible) box.expandByObject(o); }
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const dist = THREE.MathUtils.clamp(Math.max(box.getSize(new THREE.Vector3()).length() * 1.8, r.size * 0.45), r.controls.minDistance, r.controls.maxDistance);
    const dir = r.camera.position.clone().sub(r.controls.target).normalize();
    tweenTo(center.clone().add(dir.multiplyScalar(dist)), center);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only on explicit focus requests
  }, [focusNonce]);

  useEffect(() => {
    const r = rt.current;
    if (r && resetNonce > 0) tweenTo(r.home.pos.clone(), r.home.target.clone());
  }, [resetNonce]);

  const zoom = (f: number) => {
    const r = rt.current;
    if (!r) return;
    const d = r.camera.position.clone().sub(r.controls.target).multiplyScalar(f);
    const len = THREE.MathUtils.clamp(d.length(), r.controls.minDistance, r.controls.maxDistance);
    tweenTo(r.controls.target.clone().add(d.setLength(len)), r.controls.target.clone());
  };
  const home = () => { const r = rt.current; if (r) tweenTo(r.home.pos.clone(), r.home.target.clone()); };

  return (
    <div className="viewer-canvas" ref={host} role="region" aria-label={label}>
      <div className="viewer-toolbar">
        <button className="icon-btn" type="button" onClick={() => zoom(0.8)} aria-label="Zoom in">+</button>
        <button className="icon-btn" type="button" onClick={() => zoom(1.25)} aria-label="Zoom out">−</button>
        <button className="icon-btn" type="button" onClick={home} aria-label="Reset camera">⟲</button>
      </div>
      {state === "loading" && <p className="asset-gate" role="status">Loading model…</p>}
      {state === "error" && <p className="asset-gate" role="alert">The 3D model could not be loaded. Use the parts list instead.</p>}
      {state === "ready" && missing.length > 0 && (
        <p className="asset-gate" role="status">{missing.length} bound mesh name(s) not found in this model: {missing.slice(0, 4).join(", ")}</p>
      )}
    </div>
  );
}

/** Explode offsets are recorded in model (world) space; convert to each node's parent space. */
function toParentSpace(bound: Map<string, THREE.Object3D>, world: Map<string, Vec3>): Map<string, Vec3> {
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

function applyLook(r: Runtime, highlighted: Set<string>, hidden: Set<string>, isolate: boolean) {
  for (const [n, o] of r.bound) o.visible = !hidden.has(n);
  const ghostOthers = isolate && highlighted.size > 0;
  for (const { owner, mats } of r.meshes) {
    const lit = owner !== null && highlighted.has(owner);
    const ghost = ghostOthers && !lit;
    for (const s of mats) {
      const std = s.mat as THREE.MeshStandardMaterial;
      if (std.emissive) { std.emissive.copy(lit ? HIGHLIGHT : BLACK); std.emissiveIntensity = lit ? 0.5 : 0; }
      s.mat.transparent = ghost || s.transparent;
      s.mat.opacity = ghost ? GHOST_OPACITY : s.opacity;
      s.mat.depthWrite = ghost ? false : s.depthWrite;
      s.mat.needsUpdate = true;
    }
  }
}

function isShown(o: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
