// DOM overlay of part-name labels for the 3D viewer. Each label follows its
// mesh and a thin line points back to where the part sits in the assembled car.
// Labels are updated imperatively every frame (no React re-render per frame).
import * as THREE from "three";

export interface LabelState {
  /** Meshes whose labels show at full size (current step, selection). */
  focus: Set<string>;
  /** Show small labels for every pulled-out part, not just the focused ones. */
  showAll: boolean;
  hover: string | null;
}

interface Entry { name: string; el: HTMLButtonElement; line: SVGLineElement }

const SVG = "http://www.w3.org/2000/svg";

export class LabelLayer {
  private root: HTMLDivElement;
  private svg: SVGSVGElement;
  private entries: Entry[] = [];
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();

  constructor(host: HTMLElement, labels: Record<string, string>, names: Iterable<string>, onPick: (name: string) => void) {
    this.root = document.createElement("div");
    this.root.className = "viewer-labels";
    this.root.setAttribute("aria-hidden", "true");
    this.svg = document.createElementNS(SVG, "svg");
    this.root.appendChild(this.svg);
    for (const name of names) {
      const text = labels[name];
      if (!text) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.tabIndex = -1;
      el.className = "vlabel";
      el.style.display = "none";
      el.textContent = text;
      el.addEventListener("click", () => onPick(name));
      const line = document.createElementNS(SVG, "line");
      line.style.display = "none";
      this.svg.appendChild(line);
      this.root.appendChild(el);
      this.entries.push({ name, el, line });
    }
    host.appendChild(this.root);
  }

  /**
   * @param rest   world-space centre of each part in the assembled car
   * @param now    world-space offset currently applied to each part
   * @param amount explode progress per part (0..1)
   * @param shown  false when the part is hidden
   */
  update(camera: THREE.Camera, w: number, h: number, rest: Map<string, THREE.Vector3>, now: Map<string, THREE.Vector3>,
    amount: Map<string, number>, shown: (n: string) => boolean, s: LabelState, lit: Set<string>) {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    // A whole selected system (many parts) is labelled only once its parts are out, to avoid a pile of labels.
    const litLabels = lit.size <= 4;
    for (const { name, el, line } of this.entries) {
      const t = amount.get(name) ?? 0;
      const isLit = lit.has(name) && (litLabels || t > 0.02);
      const focus = s.focus.has(name) || isLit || s.hover === name;
      const visible = shown(name) && (focus ? t > 0.02 || isLit || s.hover === name : s.showAll && t > 0.5);
      const r = rest.get(name);
      if (!visible || !r) { el.style.display = "none"; line.style.display = "none"; continue; }
      this.a.copy(r).project(camera);
      this.b.copy(r).add(now.get(name) ?? this.b.set(0, 0, 0)).project(camera);
      if (this.b.z > 1) { el.style.display = "none"; line.style.display = "none"; continue; }
      const ax = (this.a.x + 1) / 2 * w, ay = (1 - this.a.y) / 2 * h;
      const bx = (this.b.x + 1) / 2 * w, by = (1 - this.b.y) / 2 * h;
      el.style.display = "";
      el.className = `vlabel${focus ? "" : " past"}${lit.has(name) ? " lit" : ""}`;
      // Nudge the label upwards until it no longer overlaps one already placed.
      const lw = el.offsetWidth + 4, lh = el.offsetHeight + 3;
      let ly = by - lh * 0.9;
      for (let i = 0; i < 12 && placed.some((q) => Math.abs(q.x - bx) < (q.w + lw) / 2 && Math.abs(q.y - ly) < (q.h + lh) / 2); i++) ly -= lh;
      placed.push({ x: bx, y: ly, w: lw, h: lh });
      el.style.transform = `translate(${bx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -50%)`;
      if (t > 0.05) {
        line.style.display = "";
        line.setAttribute("x1", ax.toFixed(1)); line.setAttribute("y1", ay.toFixed(1));
        line.setAttribute("x2", bx.toFixed(1)); line.setAttribute("y2", ly.toFixed(1));
        line.setAttribute("class", focus ? "" : "past");
      } else {
        line.style.display = "none";
      }
    }
  }

  dispose() { this.root.remove(); }
}
