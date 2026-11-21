"use client";
// 3D product stage: the photo floats above a contact shadow and tilts with the pointer (or a finger drag).
// Thumbnails swap the photo with a flip. Falls back to a gentle idle float; static for reduced motion.
import Image from "next/image";
import { useRef, useState } from "react";

export default function PartGallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const set = (x: number, y: number, on: boolean) => {
    const el = stage.current; if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.dataset.live = on ? "1" : "0";
      el.style.setProperty("--ry", `${(x * 24).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * 18).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
    });
  };
  const move = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5, true);
  };
  const pick = (n: number) => { if (n === i) return; setFlip((f) => f + 1); setI(n); };

  return (
    <div className="gal3d">
      <div ref={stage} className="gal3d-stage" data-live="0" onPointerMove={move} onPointerDown={move} onPointerLeave={() => set(0, 0, false)}>
        <div className="gal3d-card" key={flip}>
          <Image src={images[i]} alt={`${name} — photo ${i + 1}`} fill sizes="(max-width: 1000px) 100vw, 420px" priority={i === 0} />
        </div>
        <span className="gal3d-shadow" aria-hidden="true" />
        <span className="gal3d-glare" aria-hidden="true" />
      </div>
      {images.length > 1 && (
        <div className="gal3d-thumbs" role="tablist" aria-label="Photos">
          {images.map((src, n) => (
            <button key={src} role="tab" aria-selected={n === i} aria-label={`Photo ${n + 1}`} onClick={() => pick(n)}>
              <Image src={src} alt="" fill sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
