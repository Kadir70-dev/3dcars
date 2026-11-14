"use client";
// The three marques in one 3D stage: pick a car, spin it, take it apart.
import { useState } from "react";
import FullscreenDemo, { type DemoPreset } from "./FullscreenDemo";

const CARS: { id: DemoPreset; make: string; model: string }[] = [
  { id: "ferrari458", make: "Ferrari", model: "458 Italia" },
  { id: "lamborghini", make: "Lamborghini", model: "Centenario" },
  { id: "maserati", make: "Maserati", model: "GT concept" },
];

export default function CarSwitcher({ initial = "ferrari458" }: { initial?: DemoPreset }) {
  const [car, setCar] = useState<DemoPreset>(initial);
  return (
    <div className="car-switcher">
      <div className="car-tabs" role="tablist" aria-label="Choose a car">
        {CARS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={car === c.id} className="car-tab" onClick={() => setCar(c.id)}>
            <b>{c.make}</b><span>{c.model}</span>
          </button>
        ))}
      </div>
      {/* Keyed so each car mounts fresh (its own scene, state and camera). */}
      <div role="tabpanel"><FullscreenDemo key={car} preset={car} embedded /></div>
    </div>
  );
}
