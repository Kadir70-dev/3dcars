import type { Site } from "@/components/SatelliteMap";

export const SITES: Site[] = [
  {
    id: "modena", city: "Modena", entity: "Autovivo SRL, Italy",
    address: "Via Vignolese 186/188 – 41124 Modena MO, Italy",
    phone: "+39 059 787 8337", tel: "+390597878337", hours: "Mon – Fri · 09:00 – 17:00",
    lng: 10.93314, lat: 44.63686,
    maps: "https://www.google.com/maps/search/?api=1&query=Via+Vignolese+186+41124+Modena",
  },
  {
    id: "dubai", city: "Dubai", entity: "Autovivo L.L.C",
    address: "Store 68, Al-Wasl Compound, 1st Al-Khail Rd, Dubai",
    phone: "+971 4 328 7914", tel: "+97143287914", hours: "Mon – Sat · 08:30 – 18:00",
    lng: 55.21583844, lat: 25.12822745,
    maps: "https://www.google.com/maps/search/?api=1&query=Autovivo+Spare+Parts+LLC+Dubai",
  },
];
