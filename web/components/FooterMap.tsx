"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/i18n";
import { SITES } from "@/lib/sites";

const SatelliteMap = dynamic(() => import("@/components/SatelliteMap"), { ssr: false });

/** The Find us map, shown above the footer text on every page except /contact (which already is the map).
 *  It only mounts once it nears the viewport, so the WebGL map never slows a page down for visitors who don't scroll here. */
export function FooterMap() {
  const path = usePathname();
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const hidden = path.startsWith("/contact");

  useEffect(() => {
    const el = box.current;
    if (hidden || !el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hidden]);

  if (hidden) return null;
  return (
    <section className="footer-map wrap" aria-labelledby="footer-find-us">
      <div className="eyebrow"><T>Find us</T></div>
      <h2 id="footer-find-us"><T>Two warehouses, one genuine-parts desk.</T></h2>
      <div ref={box} className="footer-map-box">{near ? <SatelliteMap sites={SITES} /> : <div className="sat" aria-hidden="true" />}</div>
    </section>
  );
}
