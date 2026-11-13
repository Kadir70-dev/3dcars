"use client";
// WebGL viewer for a licensed vehicle model. Hotspots and exploded offsets come
// only from asset_mesh_bindings; unbound meshes are never labelled or moved.
// All selection/visibility state is owned by the parent so the model and the
// parts list stay in sync.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { MeshBinding } from "@/lib/api";
import { easeInOut, explodeTargets, missingMeshes, type Vec3 } from "@/lib/explode";

export type ModelSource = { type: "url"; url: string } | { type: "scene"; build: () => THREE.Object3D };

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
}

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
}

const HIGHLIGHT = new THREE.Color("#d8b36b");
const BLACK = new THREE.Color(0);
const GHOST_OPACITY = 0.08;

export default function Viewer3D(props: Props) {
  const { source, bindings, label, highlighted, exploded, hidden, isolate, onPickMesh, focusNonce, resetNonce } = props;
  const host = useRef<HTMLDivElement>(null);
  const rt = useRef<Runtime | null>(null);
  const pickRef = useRef(onPickMesh);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => { pickRef.current = onPickMesh; }, [onPickMesh]);

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
      camera.position.copy(center).add(new THREE.Vector3(size * 1.05, size * 0.5, size * 1.2));
      controls.target.copy(center);
      controls.minDistance = size * 0.2;
      controls.maxDistance = size * 3;
      camera.updateProjectionMatrix();
      rt.current = {
        bound, meshes,
        base: new Map([...bound].map(([n, o]) => [n, o.position.clone()])),
        targets: explodeTargets(bindings, [...bound.keys()]),
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
      new GLTFLoader().load(source.url, (g) => mount(g.scene), undefined, () => !disposed && setState("error"));
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
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const r = rt.current;
      if (r) {
        const step = reduce ? 1 : dt / 700;
        for (const [n, o] of r.bound) {
          const cur = r.t.get(n)!, goal = r.want.get(n)!;
          if (cur === goal) continue;
          const next = goal > cur ? Math.min(goal, cur + step) : Math.max(goal, cur - step);
          r.t.set(n, next);
          const b = r.base.get(n)!, off = r.targets.get(n)!, k = easeInOut(next);
          o.position.set(b.x + off[0] * k, b.y + off[1] * k, b.z + off[2] * k);
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
    for (const n of r.bound.keys()) r.want.set(n, exploded.has(n) ? 1 : 0);
  }, [exploded, state]);

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
    const dist = THREE.MathUtils.clamp(box.getSize(new THREE.Vector3()).length() * 1.8, r.controls.minDistance, r.controls.maxDistance);
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
