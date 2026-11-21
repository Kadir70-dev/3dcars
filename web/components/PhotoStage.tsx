"use client";
// A real photo of a Ferrari with tappable points. Each point opens the matching spare parts in the store.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HotspotWithCount } from "@/lib/hotspots";

const PHOTO = { src: "/photos/ferrari-488-gtb.jpg", w: 3840, h: 1768 };

export default function PhotoStage({ spots, brand = "Ferrari" }: { spots: HotspotWithCount[]; brand?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const active = spots.find((s) => s.key === open) ?? null;

  // On a phone the photo is wider than the screen: start on the front of the car.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) * 0.62;
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="photo-wrap" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
      <div className="photo-scroll" ref={scroller} onClick={(e) => { if (!(e.target as HTMLElement).closest(".hotspot")) setOpen(null); }}>
        <div className="photo-inner">
          <Image src={PHOTO.src} alt="Red Ferrari 488 GTB, front three-quarter view" width={PHOTO.w} height={PHOTO.h} priority sizes="(max-width: 720px) 640px, 75vw" className="photo-img" />
          {spots.map((s) => (
            <button key={s.key} type="button" className="hotspot" data-active={open === s.key || undefined}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
              aria-expanded={open === s.key} aria-label={`${s.label}, ${s.count} ${brand} parts`}
              onClick={() => setOpen(open === s.key ? null : s.key)}>
              <span className="hotspot-dot" aria-hidden="true" />
              <span className="hotspot-label" aria-hidden="true">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="photo-card" data-open={active ? "" : undefined} role="status" aria-live="polite">
        {active ? (
          <>
            <div className="eyebrow">{brand} · tap another point</div>
            <h2>{active.label}</h2>
            <p>{active.count} {brand} part{active.count === 1 ? "" : "s"} listed. Prices on request.</p>
            <div className="photo-card-actions">
              <Link className="btn primary" href={`/store?brand=${brand}&q=${encodeURIComponent(active.term)}`}>View {active.count} parts</Link>
              <button type="button" className="btn" onClick={() => setOpen(null)}>Close</button>
            </div>
          </>
        ) : (
          <p className="photo-hint"><span className="hint-fine">Click a glowing point on the car to see its spare parts</span><span className="hint-coarse">Tap a glowing point · swipe the photo sideways</span></p>
        )}
      </div>

      <p className="photo-credit">
        Photo: <a href="https://commons.wikimedia.org/wiki/File:Ferrari_488_GTB_IMG_4120.jpg" target="_blank" rel="noreferrer">Alexander Migl</a>,{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>, via Wikimedia Commons. Number plate blurred.
      </p>
    </div>
  );
}
