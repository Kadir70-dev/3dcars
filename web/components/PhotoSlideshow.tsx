"use client";
// Hero stage: cross-fading car photos, one every 3 seconds.
import Image from "next/image";
import { useEffect, useState } from "react";
import { L, T } from "@/lib/i18n";

const SLIDES = [
  { src: "/photos/ferrari-488-gtb.webp", make: "Ferrari", model: "488 GTB" },
  { src: "/photos/ferrari-458-italia.webp", make: "Ferrari", model: "458 Italia" },
  { src: "/photos/lamborghini-centenario.webp", make: "Lamborghini", model: "Centenario" },
];
const INTERVAL_MS = 3000;

export default function PhotoSlideshow() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="stage3d slideshow">
      {SLIDES.map((s, n) => (
        <Image key={s.src} src={s.src} alt={`${s.make} ${s.model}`} fill priority={n === 0} sizes="100vw"
          className="slide" style={{ opacity: n === i ? 1 : 0 }} />
      ))}
      <L className="car-tabs" role="tablist" aria-label="Choose a car">
        {SLIDES.map((s, n) => (
          <button key={s.src} type="button" role="tab" aria-selected={n === i} className="car-tab" onClick={() => setI(n)}>
            <b>{s.make}</b><span><T>{s.model}</T></span>
          </button>
        ))}
      </L>
    </div>
  );
}
