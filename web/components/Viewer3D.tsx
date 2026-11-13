"use client";
// WebGL viewer for a licensed vehicle model. Hotspots and exploded offsets come
// only from asset_mesh_bindings; unbound meshes are never labelled or moved.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { MeshBinding } from "@/lib/api";
import { codeForMesh, easeInOut, explodeTargets, lerpVec, meshesForCode, missingMeshes, type Vec3 } from "@/lib/explode";

export type ModelSource = { type: "url"; url: string } | { type: "scene"; build: () => THREE.Object3D };

interface Props {
  source: ModelSource;
  bindings: MeshBinding[];
  selectedCode: string | null;
  exploded: boolean;
  onSelectCode: (code: string) => void;
  label: string;
}

interface Runtime {
  bound: Map<string, THREE.Object3D>;
  base: Map<string, THREE.Vector3>;
  targets: Map<string, Vec3>;
  t: number; dir: 0 | 1;
  camera: THREE.PerspectiveCamera; controls: OrbitControls; home: { pos: THREE.Vector3; target: THREE.Vector3 };
  scale: number;
}

const HIGHLIGHT = new THREE.Color("#d8b36b");

export default function Viewer3D({ source, bindings, selectedCode, exploded, onSelectCode, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rt = useRef<Runtime | null>(null);
  const selectRef = useRef(onSelectCode);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => { selectRef.current = onSelectCode; }, [onSelectCode]);

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
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
        }
      });
      scene.add(root);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      camera.near = size / 100;
      camera.far = size * 20;
      camera.position.copy(center).add(new THREE.Vector3(size * 1.05, size * 0.5, size * 1.2));
      controls.target.copy(center);
      controls.minDistance = size * 0.35;
      controls.maxDistance = size * 3;
      camera.updateProjectionMatrix();
      rt.current = {
        bound,
        base: new Map([...bound].map(([n, o]) => [n, o.position.clone()])),
        targets: explodeTargets(bindings, [...bound.keys()]),
        t: 0, dir: 0,
        camera, controls, home: { pos: camera.position.clone(), target: center.clone() },
        scale: size,
      };
      setMissing(missingMeshes(bindings, all));
      setState("ready");
    };

    if (source.type === "scene") {
      mount(source.build());
    } else {
      new GLTFLoader().load(source.url, (g) => mount(g.scene), undefined, () => !disposed && setState("error"));
    }

    // Click (not drag) selects the bound ancestor of the hit mesh.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || !rt.current) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      for (const hit of ray.intersectObjects(scene.children, true)) {
        for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) {
          const code = names.has(o.name) ? codeForMesh(bindings, o.name) : null;
          if (code) { selectRef.current(code); return; }
        }
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
      if (r && r.t !== r.dir) {
        const step = reduce ? 1 : dt / 700;
        r.t = r.dir > r.t ? Math.min(r.dir, r.t + step) : Math.max(r.dir, r.t - step);
        const k = easeInOut(r.t);
        for (const [n, o] of r.bound) {
          const b = r.base.get(n)!;
          const off = lerpVec([0, 0, 0], r.targets.get(n) ?? [0, 0, 0], k);
          o.position.set(b.x + off[0], b.y + off[1], b.z + off[2]);
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

  useEffect(() => {
    const r = rt.current;
    if (!r) return;
    r.dir = exploded ? 1 : 0;
  }, [exploded, state]);

  useEffect(() => {
    const r = rt.current;
    if (!r) return;
    const on = meshesForCode(bindings, selectedCode);
    for (const [name, obj] of r.bound) {
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
          const std = mat as THREE.MeshStandardMaterial;
          if (std.emissive) { std.emissive.copy(on.has(name) ? HIGHLIGHT : new THREE.Color(0)); std.emissiveIntensity = on.has(name) ? 0.35 : 0; }
        }
      });
    }
  }, [selectedCode, bindings, state]);

  const zoom = (f: number) => {
    const r = rt.current;
    if (!r) return;
    const d = r.camera.position.clone().sub(r.controls.target).multiplyScalar(f);
    const len = THREE.MathUtils.clamp(d.length(), r.controls.minDistance, r.controls.maxDistance);
    r.camera.position.copy(r.controls.target).add(d.setLength(len));
  };
  const reset = () => {
    const r = rt.current;
    if (!r) return;
    r.camera.position.copy(r.home.pos);
    r.controls.target.copy(r.home.target);
  };

  return (
    <div className="viewer-canvas" ref={host} role="region" aria-label={label}>
      <div className="viewer-toolbar">
        <button className="icon-btn" type="button" onClick={() => zoom(0.8)} aria-label="Zoom in">+</button>
        <button className="icon-btn" type="button" onClick={() => zoom(1.25)} aria-label="Zoom out">−</button>
        <button className="icon-btn" type="button" onClick={reset} aria-label="Reset view">⟲</button>
      </div>
      {state === "loading" && <p className="asset-gate" role="status">Loading model…</p>}
      {state === "error" && <p className="asset-gate" role="alert">The 3D model could not be loaded. Use the assembly list instead.</p>}
      {state === "ready" && missing.length > 0 && (
        <p className="asset-gate" role="status">{missing.length} bound mesh name(s) not found in this model: {missing.slice(0, 4).join(", ")}</p>
      )}
    </div>
  );
}
