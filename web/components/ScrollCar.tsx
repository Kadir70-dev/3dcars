"use client";
// Apple-style scroll showcase: a pinned 3D car that turns a full 360° as you
// scroll, then comes apart piece by piece. Scroll position drives the scene
// (scrubbed and smoothed); reduced-motion users get a still, assembled car.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { DEMO458_BINDINGS, DEMO458_URL, tuneDemo458 } from "@/lib/demo458";
import { easeInOut, explodeTargets } from "@/lib/explode";
import { toParentSpace } from "@/lib/sceneUtils";

export interface Caption { from: number; to: number; eyebrow: string; title: string; body: string }

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => { const m = window.matchMedia(REDUCED); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Fraction of the scroll spent turning the car; the rest takes it apart. */
const TURN_END = 0.48;

export default function ScrollCar({ captions, credit }: { captions: Caption[]; credit: React.ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);

  useEffect(() => {
    const el = host.current!, sec = section.current!;
    const reduce = window.matchMedia(REDUCED).matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 6, 4);
    scene.add(key, new THREE.HemisphereLight(0xffffff, 0xf3d9d3, 0.6));
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
    const pivot = new THREE.Group();
    scene.add(pivot);

    let fit = 1, shown = -1;
    // Camera pulls back as the car comes apart (k = 0 assembled … 1 exploded).
    const place = (k: number) => {
      const d = fit * (1 + 0.45 * k);
      camera.position.set(0, 2.6 * d, 9.5 * d);
      camera.lookAt(0, 0.9 + 0.6 * k, 0); // aim above the car so it sits below the captions
    };
    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      // Keep the whole car in frame on narrow (portrait) screens.
      fit = camera.aspect < 1.2 ? Math.pow(1.2 / camera.aspect, 0.85) : 1;
      place(0);
      camera.updateProjectionMatrix();
      shown = -1;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    type Part = { o: THREE.Object3D; base: THREE.Vector3; off: THREE.Vector3; order: number };
    let parts: Part[] = [];
    let disposed = false;
    const draco = new DRACOLoader().setDecoderPath("/draco/");
    new GLTFLoader().setDRACOLoader(draco).load(DEMO458_URL, (g) => {
      draco.dispose();
      if (disposed) return;
      const root = g.scene;
      tuneDemo458(root);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const c = box.getCenter(new THREE.Vector3());
      root.position.sub(new THREE.Vector3(c.x, box.min.y, c.z)); // centre on the turntable
      pivot.add(root);
      root.updateMatrixWorld(true);
      const names = new Set(DEMO458_BINDINGS.map((b) => b.meshName));
      const bound = new Map<string, THREE.Object3D>();
      root.traverse((o) => { if (names.has(o.name) && !bound.has(o.name)) bound.set(o.name, o); });
      const local = toParentSpace(bound, explodeTargets(DEMO458_BINDINGS, [...bound.keys()]));
      parts = DEMO458_BINDINGS.filter((b) => bound.has(b.meshName)).map((b, i) => {
        const o = bound.get(b.meshName)!;
        return { o, base: o.position.clone(), off: new THREE.Vector3(...local.get(b.meshName)!), order: i };
      });
      setReady(true);
    }, undefined, () => draco.dispose());

    let target = 0, raf = 0, visible = true;
    const readScroll = () => {
      const r = sec.getBoundingClientRect();
      target = reduce ? 0 : clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "200px" });
    io.observe(sec);
    window.addEventListener("scroll", readScroll, { passive: true });
    readScroll();

    let p = target, last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (!visible) return;
      p += (target - p) * (1 - Math.exp(-dt / 140)); // smoothed scrub, same feel at any frame rate
      if (Math.abs(p - shown) < 0.0004 && parts.length) return; // nothing changed: skip the render
      shown = p;
      setProgress(p);
      const turn = easeInOut(clamp01(p / TURN_END));
      pivot.rotation.y = -0.65 + turn * Math.PI * 2 + clamp01((p - TURN_END) / (1 - TURN_END)) * 0.6;
      const k = clamp01((p - TURN_END) / (0.94 - TURN_END));
      place(easeInOut(k));
      const n = Math.max(1, parts.length);
      for (const part of parts) {
        // Parts leave in disassembly order, each taking a short slice of the scroll.
        const t = easeInOut(clamp01(k * 1.8 - (part.order / n) * 0.8));
        part.o.position.copy(part.base).addScaledVector(part.off, t * 0.7);
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readScroll);
      io.disconnect();
      ro.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose()); }
      });
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <section ref={section} className={`scroll-car${reduced ? " is-reduced" : ""}`} aria-label="3D showcase">
      <div className="scroll-car-stage">
        <div className="scroll-car-canvas" ref={host} />
        {!ready && <p className="scroll-car-loading" role="status">Loading 3D model…</p>}
        <div className="scroll-car-captions">
          {captions.map((c) => {
            const on = reduced || (progress >= c.from && progress < c.to);
            return (
              <div key={c.title} className={`scroll-car-caption${on ? " on" : ""}`} aria-hidden={!on}>
                <div className="eyebrow">{c.eyebrow}</div>
                <h2>{c.title}</h2>
                <p>{c.body}</p>
              </div>
            );
          })}
        </div>
        <div className="scroll-car-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
        <p className="scroll-car-credit">{credit}</p>
      </div>
    </section>
  );
}
