import Link from "next/link";
import { T } from "@/lib/i18n";

export default function NotFound() {
  return (
    <section className="wrap page-head">
      <div className="eyebrow">404</div>
      <h1><T>{"Not in the <em>catalogue.</em>"}</T></h1>
      <p><T>This page or record does not exist. Only the Ferrari 488 GTB is available at the moment.</T></p>
      <p><Link className="btn" href="/vehicles/ferrari-488-gtb"><T>Open the explorer</T></Link></p>
    </section>
  );
}
