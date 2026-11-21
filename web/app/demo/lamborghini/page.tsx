import type { Metadata } from "next";
import FullscreenDemo from "@/components/FullscreenDemo";

// Model credit (CC BY 4.0) is on the Sources page and in /models/demo/ATTRIBUTION.txt.
export const metadata: Metadata = {
  title: "Lamborghini Centenario in 3D",
  description: "Explore a Lamborghini Centenario in 3D: rotate, zoom and take it apart piece by piece.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <h1 className="sr-only">Lamborghini Centenario in 3D</h1>
      <FullscreenDemo preset="lamborghini" />
    </>
  );
}
