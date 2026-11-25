"use client";
// Full-bleed cinematic video divider. Plays muted + looped only while on screen; poster is shown for reduced motion.
import { useEffect, useRef } from "react";
import { T } from "@/lib/i18n";

export default function VideoBreaker() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <section className="video-breaker" aria-label="Autovivo showreel">
      <video ref={ref} muted loop playsInline preload="none" poster="/videos/breaker-poster.jpg" aria-hidden="true">
        <source src="/videos/breaker.mp4" type="video/mp4" />
      </video>
      <div className="vb-copy wrap">
        <div className="eyebrow" style={{ color: "#fff" }}><T>Modena · Dubai · Worldwide</T></div>
        <h2><T>{"Engineered in Italy. <em>Sourced for you.</em>"}</T></h2>
      </div>
    </section>
  );
}
