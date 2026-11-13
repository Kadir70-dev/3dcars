import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap page-head">
      <div className="eyebrow">404</div>
      <h1>Not in the <em>catalogue.</em></h1>
      <p>This page or record does not exist. Only the Ferrari 488 GTB is available at the moment.</p>
      <p><Link className="btn" href="/vehicles/ferrari-488-gtb">Open the explorer</Link></p>
    </section>
  );
}
