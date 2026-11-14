"use client";
// Inspection card for the selected component of a demo/licensed model. It shows
// only facts the model itself provides (where the piece comes from, geometry
// size in triangles, its place in the disassembly) — never OEM data.
import type { MeshStats } from "./Viewer3D";
import type { ModelState } from "./ModelControls";

export interface InspectTarget {
  name: string; meshName: string; systemName: string | null; step: number | null; order: number | null;
}

export function PartInspector({ target, stats, m, note, onClear }: {
  target: InspectTarget | null; stats: MeshStats | undefined; m: ModelState; note: string; onClear: () => void;
}) {
  if (!target) {
    return (
      <div className="inspector empty-inspector">
        <span className="mc-label">Component inspection</span>
        <p className="muted">Click a part on the car or in the list to inspect it.</p>
      </div>
    );
  }
  const hidden = m.hidden.has(target.meshName);
  return (
    <div className="inspector" aria-live="polite">
      <div className="inspector-head">
        <span className="mc-label">Component inspection</span>
        <span className="pill unverified">Demo model · not OEM</span>
      </div>
      <h3>{target.name.replace(/^\d+ · /, "")}</h3>
      <dl className="inspector-kv">
        <div><dt>System</dt><dd>{target.systemName ?? "—"}</dd></div>
        <div><dt>Disassembly</dt><dd>{target.step ? `Step ${target.step}` : "—"}{target.order ? ` · #${target.order}` : ""}</dd></div>
        <div><dt>Source mesh</dt><dd className="mono">{stats?.sourceMesh ?? "—"}{stats?.islands ? ` · ${stats.islands} geometry island${stats.islands === 1 ? "" : "s"}` : ""}</dd></div>
        <div><dt>Triangles</dt><dd className="mono">{stats ? stats.triangles.toLocaleString("en-GB") : "—"}</dd></div>
        <div><dt>OEM number</dt><dd className="unknown">Not available for this model</dd></div>
      </dl>
      <p className="help">{note}</p>
      <div className="inspector-actions">
        <button type="button" className="btn small" aria-pressed={m.isolate} onClick={() => m.setIsolate(!m.isolate)}>Isolate</button>
        <button type="button" className="btn small" onClick={m.toggleHidden}>{hidden ? "Show" : "Hide"}</button>
        <button type="button" className="btn small" disabled={hidden} onClick={m.focus}>Frame</button>
        <button type="button" className="btn small" onClick={onClear}>Clear</button>
      </div>
    </div>
  );
}
