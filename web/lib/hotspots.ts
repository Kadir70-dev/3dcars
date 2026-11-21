// Clickable points on the real Ferrari photo. x / y are fractions of the photo (0-1).
// The counts are looked up live from the store data, so a point never promises parts that are not there.
import { api, type StoreResponse } from "@/lib/api";

export interface Hotspot { key: string; label: string; term: string; x: number; y: number }
export interface HotspotWithCount extends Hotspot { count: number }

export const HOTSPOTS: Hotspot[] = [
  { key: "windscreen", label: "Windscreen & glass", term: "windscreen", x: 0.539, y: 0.255 },
  { key: "bonnet", label: "Bonnet", term: "bonnet", x: 0.664, y: 0.433 },
  { key: "headlamp", label: "Headlamps", term: "headlamp", x: 0.578, y: 0.543 },
  { key: "bumper", label: "Front bumper", term: "bumper", x: 0.70, y: 0.79 },
  { key: "mirror", label: "Mirrors", term: "mirror", x: 0.293, y: 0.365 },
  { key: "door", label: "Doors", term: "door", x: 0.258, y: 0.526 },
  { key: "wheel", label: "Wheels", term: "wheel", x: 0.418, y: 0.705 },
];

export async function loadHotspots(brand = "Ferrari"): Promise<HotspotWithCount[]> {
  const counts = await Promise.all(HOTSPOTS.map(async (h) => {
    try { return (await api<StoreResponse>(`/store-parts?${new URLSearchParams({ brand, q: h.term })}`)).result.total; } catch { return 0; }
  }));
  return HOTSPOTS.map((h, i) => ({ ...h, count: counts[i] })).filter((h) => h.count > 0);
}
