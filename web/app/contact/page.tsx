import type { Metadata } from "next";
import SatelliteMap from "@/components/SatelliteMap";
import EnquiryForm from "@/components/EnquiryForm";
import { SITES } from "@/lib/sites";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Contact us — Dubai & Modena",
  description: "Autovivo Spare Parts L.L.C — Store 68, Al-Wasl Compound, Al Khail Road, Dubai, and Autovivo SRL, Via Vignolese 186/188, Modena, Italy. Genuine Ferrari, Lamborghini and Maserati parts.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow"><T>Contact us</T></div>
        <h1><T>Two warehouses, one genuine-parts desk.</T></h1>
        <p className="muted"><T>Email</T> <a href="mailto:info@autovivo.it">info@autovivo.it</a> · <T>Prices on request.</T></p>
      </header>
      <SatelliteMap sites={SITES} />
      <EnquiryForm />
    </div>
  );
}
