import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, DM_Mono, Manrope } from "next/font/google";
import { Footer, Header } from "@/components/Chrome";
import { CurrencyWidget } from "@/components/CurrencyWidget";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

// Italian luxury: a Didone display face for headlines, a clean geometric sans for text, a quiet mono for labels.
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3020"),
  ...(process.env.NEXT_PUBLIC_NOINDEX === "1" ? { robots: { index: false, follow: false } } : {}),
  title: { default: "Autovivo Spare Parts LLC – Italian Luxury Car Parts", template: "%s · Autovivo" },
  description:
    "Genuine Ferrari, Lamborghini and Maserati spare parts from our warehouses in Modena, Italy and Dubai. Fast worldwide delivery. Prices on request.",
  openGraph: { type: "website", siteName: "Autovivo Spare Parts LLC", images: [{ url: "/autovivo/logo.png" }] },
  icons: { icon: "/autovivo/logo.png", apple: "/autovivo/logo.png" },
};

export const viewport: Viewport = { themeColor: "#fffaf8", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <LangProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <CurrencyWidget />
        </LangProvider>
      </body>
    </html>
  );
}
