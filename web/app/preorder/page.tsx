import type { Metadata } from "next";
import PreorderForm from "@/components/PreorderForm";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Pre-order a part",
  description: "Pre-order genuine Ferrari, Lamborghini and Maserati spare parts from Autovivo. No online payment — we confirm availability, price and lead time by reply.",
  alternates: { canonical: "/preorder" },
};

export default function Preorder() {
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow"><T>Pre-order</T></div>
        <h1><T>{"Pre-order a <em>part.</em>"}</T></h1>
        <p><T>Tell us which part you need. We source it from Italy and Dubai and reply with price, availability and lead time. Nothing is charged online and nothing is confirmed until we have checked fitment.</T></p>
      </header>
      <PreorderForm />
    </div>
  );
}
