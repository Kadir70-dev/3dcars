"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";

export type Site = {
  id: string; city: string; entity: string; address: string; phone: string; tel: string; hours: string;
  lng: number; lat: number; maps: string; approx?: boolean;
};

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export default function SatelliteMap({ sites }: { sites: Site[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const spin = useRef(true);
  const [active, setActive] = useState(sites[0].id);
  const [ready, setReady] = useState(false);
  const site = sites.find((s) => s.id === active) ?? sites[0];

  useEffect(() => {
    let raf = 0, dead = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      if (dead || !el.current) return;
      const m = new ml.Map({
        container: el.current,
        center: [sites[0].lng, sites[0].lat], zoom: 16.2, pitch: 64, bearing: -25, maxPitch: 80,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            sat: { type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
            dem: { type: "raster-dem", tiles: [DEM], tileSize: 256, maxzoom: 14, encoding: "terrarium" },
          },
          layers: [{ id: "sat", type: "raster", source: "sat" }],
          terrain: { source: "dem", exaggeration: 1.4 },
        },
      });
      map.current = m;
      m.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
      for (const s of sites) {
        const pin = document.createElement("button");
        pin.className = "sat-pin"; pin.type = "button"; pin.setAttribute("aria-label", `Fly to ${s.city}`);
        pin.innerHTML = `<span class="sat-pin-dot"></span><span class="sat-pin-tag">${s.city}</span>`;
        pin.onclick = () => setActive(s.id);
        new ml.Marker({ element: pin, anchor: "bottom" }).setLngLat([s.lng, s.lat]).addTo(m);
      }
      const stop = () => { spin.current = false; };
      m.on("mousedown", stop); m.on("touchstart", stop); m.on("wheel", stop);
      m.on("load", () => setReady(true));
      const tick = () => {
        if (spin.current && !reduce && m.loaded()) m.setBearing(m.getBearing() + 0.06);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => { dead = true; cancelAnimationFrame(raf); map.current?.remove(); map.current = null; };
  }, [sites]);

  useEffect(() => {
    const s = sites.find((x) => x.id === active);
    if (s && map.current) {
      spin.current = true;
      map.current.flyTo({ center: [s.lng, s.lat], zoom: 16.6, pitch: 64, bearing: -25, duration: 3200, essential: false });
    }
  }, [active, sites]);

  return (
    <div className="sat">
      <div className="sat-canvas" role="img" aria-label={`3D satellite view of ${site.city}: ${site.address}`}>
        <div ref={el} style={{ width: "100%", height: "100%" }} />
      </div>
      {!ready && <div className="sat-loading">Loading satellite view…</div>}
      <div className="sat-tabs" role="tablist" aria-label="Locations">
        {sites.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === active} onClick={() => setActive(s.id)}>{s.city}</button>
        ))}
      </div>
      <aside className="sat-card" aria-live="polite">
        <small>{site.entity}</small>
        <h2>{site.city}</h2>
        <p>{site.address}</p>
        <p><a href={`tel:${site.tel}`}>{site.phone}</a><br />{site.hours}</p>
        <a className="btn small" href={site.maps} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
        {site.approx && <p className="muted" style={{ fontSize: 12 }}>Pin is approximate within Modena.</p>}
      </aside>
      <p className="sat-hint">Drag to rotate · right-drag or Ctrl-drag to tilt · scroll to zoom</p>
    </div>
  );
}
