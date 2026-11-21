import type { Metadata } from "next";
import SatelliteMap, { type Site } from "@/components/SatelliteMap";

export const metadata: Metadata = {
  title: "Find us — Dubai & Modena",
  description: "Autovivo Spare Parts L.L.C — Store 68, Al-Wasl Compound, Al Khail Road, Dubai, and Autovivo SRL, Via Vignolese 186/188, Modena, Italy. Genuine Ferrari, Lamborghini and Maserati parts.",
  alternates: { canonical: "/contact" },
};

const SITES: Site[] = [
  {
    id: "dubai", city: "Dubai", entity: "Autovivo L.L.C",
    address: "Store 68, Al-Wasl Compound, 1st Al-Khail Rd, Dubai",
    phone: "+971 4 328 7914", tel: "+97143287914", hours: "Mon – Sat · 08:30 – 18:00",
    lng: 55.21583844, lat: 25.12822745,
    maps: "https://www.google.com/maps/search/?api=1&query=Autovivo+Spare+Parts+LLC+Dubai",
  },
  {
    id: "modena", city: "Modena", entity: "Autovivo SRL, Italy",
    address: "Via Vignolese 186/188 – 41124 Modena MO, Italy",
    phone: "+39 059 787 8337", tel: "+390597878337", hours: "Mon – Fri · 09:00 – 17:00",
    lng: 10.93314, lat: 44.63686,
    maps: "https://www.google.com/maps/search/?api=1&query=Via+Vignolese+186+41124+Modena",
  },
];

export default function Contact() {
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">Find us</div>
        <h1>Two warehouses, one genuine-parts desk.</h1>
        <p className="muted">Email <a href="mailto:info@autovivo.it">info@autovivo.it</a> · Prices on request.</p>
      </header>
      <SatelliteMap sites={SITES} />
    </div>
  );
}
