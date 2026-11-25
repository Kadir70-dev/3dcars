"use client";
// Reusable interactive exploded-diagram viewer: zoom/pan/fullscreen, clickable numbered callouts,
// synchronized parts table, OEM search, price/availability, enquiry-list ("cart") and quotation actions.
// The diagram is rendered through <img>, so a source SVG can never execute script in our origin.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shortlist, useShortlist } from "@/lib/shortlist";
import {
  centerOn, clampTransform, formatPrice, IDENTITY, matchesQuery, zoomAt,
  type Callout, type DiagramRow, type DiagramSource, type Transform,
} from "@/lib/diagramViewer";
import "./diagram-viewer.css";

interface Props {
  diagram: DiagramSource;
  callouts: Callout[];
  rows: DiagramRow[];
  title?: string;
  notice?: string;                 // e.g. "Placeholder diagram - demo data"
}

export default function DiagramViewer({ diagram, callouts, rows, title, notice }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const vpRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number } | null>(null);
  const [t, setT] = useState<Transform>(IDENTITY);
  const [panning, setPanning] = useState(false);
  const [fs, setFs] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const items = useShortlist();

  const size = () => {
    const r = vpRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1, h: r?.height ?? 1, l: r?.left ?? 0, tp: r?.top ?? 0 };
  };
  const zoomBy = useCallback((f: number, px?: number, py?: number) => {
    const { w, h } = size();
    setT((c) => zoomAt(c, f, px ?? w / 2, py ?? h / 2, w, h));
  }, []);

  // Wheel zoom needs a non-passive listener to stop page scroll while over the diagram.
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { l, tp } = size();
      zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - l, e.clientY - tp);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".dv-pin")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setPanning(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const { w, h, l, tp } = size();
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const f = dist / gesture.current.dist;
      gesture.current = { dist };
      setT((c) => zoomAt(c, f, (a.x + b.x) / 2 - l, (a.y + b.y) / 2 - tp, w, h));
    } else if (pointers.current.size === 1) {
      setT((c) => clampTransform({ ...c, x: c.x + cur.x - prev.x, y: c.y + cur.y - prev.y }, w, h));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    gesture.current = null;
    if (pointers.current.size === 0) setPanning(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const { w, h } = size();
    const step = 40;
    const pan = (dx: number, dy: number) => setT((c) => clampTransform({ ...c, x: c.x + dx, y: c.y + dy }, w, h));
    if (e.key === "+" || e.key === "=") zoomBy(1.3);
    else if (e.key === "-") zoomBy(1 / 1.3);
    else if (e.key === "0") setT(IDENTITY);
    else if (e.key === "ArrowLeft") pan(step, 0);
    else if (e.key === "ArrowRight") pan(-step, 0);
    else if (e.key === "ArrowUp") pan(0, step);
    else if (e.key === "ArrowDown") pan(0, -step);
    else return;
    e.preventDefault();
  };

  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

  const visible = useMemo(() => rows.filter((r) => matchesQuery(r, q)), [rows, q]);
  const visibleRefs = useMemo(() => new Set(visible.map((r) => r.ref)), [visible]);
  const selRows = rows.filter((r) => r.ref === sel);

  const select = (ref: string, from: "pin" | "row") => {
    setSel((c) => (c === ref && from === "pin" ? null : ref));
    if (from === "row") {
      const c = callouts.find((x) => x.ref === ref);
      if (c && t.k > 1) {
        const { w, h } = size();
        setT((cur) => centerOn(cur, c.x / diagram.width, c.y / diagram.height, w, h));
      }
    } else {
      document.getElementById(`dv-row-${ref}`)?.scrollIntoView({ block: "nearest" });
    }
  };

  const inList = (pn: string) => items.some((x) => x.kind === "part" && x.ref === pn);
  const add = (r: DiagramRow) => shortlist.add({ kind: "part", ref: r.partNumber, label: `${r.partNumber} - ${r.description}` });

  return (
    <section className="dv" aria-label={title ?? "Interactive parts diagram"}>
      <div className="dv-stage" ref={stageRef} style={{ ["--dv-ar" as string]: `${diagram.width} / ${diagram.height}` }}>
        <div className="dv-tools" role="toolbar" aria-label="Diagram controls">
          <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => zoomBy(1.3)}>+</button>
          <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.3)}>−</button>
          <button type="button" className="icon-btn" aria-label="Reset view" onClick={() => setT(IDENTITY)}>⟲</button>
          <button type="button" className="icon-btn" aria-label={fs ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFs}>{fs ? "✕" : "⛶"}</button>
        </div>
        <div
          ref={vpRef} className={"dv-viewport" + (panning ? " panning" : "")} tabIndex={0} role="application"
          aria-label={`${title ?? "Diagram"}. Plus and minus zoom, arrow keys pan, zero resets.`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onKeyDown={onKey}
        >
          <div className="dv-layer" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={diagram.src} alt={diagram.alt} draggable={false} />
            {callouts.map((c) => (
              <button
                key={c.ref} type="button"
                className={"dv-pin" + (sel === c.ref ? " on" : "") + (q && !visibleRefs.has(c.ref) ? " dim" : "")}
                style={{ left: `${(c.x / diagram.width) * 100}%`, top: `${(c.y / diagram.height) * 100}%`, transform: `scale(${1 / t.k}) ${sel === c.ref ? "scale(1.3)" : ""}` }}
                aria-pressed={sel === c.ref} aria-label={`Component ${c.ref}`}
                onClick={() => select(c.ref, "pin")}
              >{c.ref}</button>
            ))}
          </div>
        </div>
        {notice && <div className="dv-hint">{notice}</div>}
      </div>

      <div className="dv-side">
        <input className="dv-search" type="search" inputMode="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search OEM number, description or ref" aria-label="Search parts in this diagram" />
        <div className="dv-list table-wrap">
          <table className="data-table">
            <thead><tr><th>Ref</th><th>OEM / description</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>
              {visible.map((r) => (
                <tr key={`${r.ref}-${r.partNumber}`} id={`dv-row-${r.ref}`} className={"dv-row" + (sel === r.ref ? " on" : "")}
                  onClick={() => select(r.ref, "row")} aria-selected={sel === r.ref}>
                  <td className="dv-ref">{r.ref}</td>
                  <td><div className="dv-oem">{r.partNumber}</div><div className="dv-sub">{r.description}</div></td>
                  <td>{r.quantity ?? "—"}</td>
                  <td className="dv-price">{formatPrice(r.price, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <div className="dv-empty">No part matches “{q}”.</div>}
        </div>

        {selRows.map((r) => (
          <div className="dv-detail" key={r.partNumber} aria-live="polite">
            <div className="dv-ref">Ref {r.ref}</div>
            <div className="dv-oem">{r.partNumber}</div>
            <div className="dv-sub">{r.description}</div>
            <dl>
              <dt>Price</dt><dd>{formatPrice(r.price, r.currency)}</dd>
              <dt>Quantity</dt><dd>{r.quantity ?? "—"} per assembly</dd>
              <dt>Availability</dt><dd>{r.availability || "On request"}</dd>
              {r.specification && <><dt>Spec</dt><dd>{r.specification}</dd></>}
              {r.supersededBy && <><dt>Superseded</dt><dd>{r.supersededBy}</dd></>}
              {r.models?.length ? <><dt>Fits</dt><dd>{r.models.join(", ")}</dd></> : null}
            </dl>
            <div className="dv-actions">
              <button type="button" className={inList(r.partNumber) ? "btn" : "btn primary"}
                onClick={() => (inList(r.partNumber) ? shortlist.remove({ kind: "part", ref: r.partNumber }) : add(r))}>
                {inList(r.partNumber) ? "✓ In enquiry list" : r.price != null && r.price > 0 ? "Add to cart" : "Add to enquiry list"}
              </button>
              <Link className="btn" href="/quote" onClick={() => add(r)}>Request quotation</Link>
            </div>
          </div>
        ))}
        {!sel && <p className="dv-sub">Select a numbered component on the diagram, or a row, to see price, availability and fitment.</p>}
      </div>
    </section>
  );
}
