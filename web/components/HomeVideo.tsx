"use client";
// Home hero: full-screen photos that cross-fade automatically every 3 seconds (1 → 2 → 3 → 1 …).
// The navbar is fully transparent over the hero and turns solid once you scroll past it.
import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/photos/ferrari-488-gtb.webp", alt: "Ferrari 488 GTB" },
  { src: "/photos/lamborghini-centenario.webp", alt: "Lamborghini Centenario" },
  { src: "/photos/ferrari-458-italia.webp", alt: "Ferrari 458 Italia" },
];
const INTERVAL_MS = 3000;

export default function HomeVideo({ children }: { children?: React.ReactNode }) {
  const [past, setPast] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => { if (!document.hidden) setI((n) => (n + 1) % SLIDES.length); }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [i]);
  useEffect(() => {
    const on = () => setPast(window.scrollY > window.innerHeight - 90);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-past", past);
    return () => document.documentElement.removeAttribute("data-past");
  }, [past]);
  return (
    <section className="home-video home-slides" aria-label="Autovivo">
      {/* Inline: the CSS minifier rewrites backdrop-filter overrides incorrectly. */}
      {!past && <style>{"header.nav{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}"}</style>}
      {SLIDES.map((s, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={s.src} src={s.src} alt={n === i ? s.alt : ""} aria-hidden={n !== i} className={n === i ? "hs-img on" : "hs-img"} loading={n === 0 ? "eager" : "lazy"} fetchPriority={n === 0 ? "high" : "auto"} decoding="async" />
      ))}
      <div className="hs-dots" role="tablist" aria-label="Hero images">
        {SLIDES.map((s, n) => <button key={s.src} type="button" role="tab" aria-selected={n === i} aria-label={`${s.alt} (${n + 1}/${SLIDES.length})`} onClick={() => setI(n)} />)}
      </div>
      {children}
    </section>
  );
}
