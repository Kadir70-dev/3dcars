import { T } from "@/lib/i18n";

export function ApiDown() {
  return (
    <section className="wrap page-head" role="alert">
      <div className="eyebrow"><T>Service unavailable</T></div>
      <h1><T>Catalogue offline.</T></h1>
      <p><T>The parts catalogue could not be reached. Please try again in a moment. Nothing on this page is cached or guessed.</T></p>
    </section>
  );
}
