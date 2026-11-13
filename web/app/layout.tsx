import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Footer, Header } from "@/components/Chrome";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3020"),
  title: { default: "Apex Auto Atlas — Ferrari 488 GTB parts explorer", template: "%s · Apex Auto Atlas" },
  description:
    "Independent research explorer for Ferrari 488 GTB assemblies and parts, with sources and verification status on every record. Not affiliated with Ferrari.",
  openGraph: { type: "website", siteName: "Apex Auto Atlas" },
};

export const viewport: Viewport = { themeColor: "#0b0c0d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
