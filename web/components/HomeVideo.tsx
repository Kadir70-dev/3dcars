// Home page: one full-screen looping video; the photo is the poster until the video plays.
export default function HomeVideo() {
  return (
    <section className="home-video" aria-label="Autovivo">
      {/* Inline: the CSS minifier rewrites backdrop-filter overrides incorrectly. */}
      <style>{"header.nav{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}"}</style>
      <video autoPlay muted loop playsInline preload="auto" poster="/photos/ferrari-488-gtb.jpg">
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
    </section>
  );
}
