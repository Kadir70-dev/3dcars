import { T } from "@/lib/i18n";

const Italy = () => (
  <svg className="tb-flag" viewBox="0 0 30 20" aria-hidden="true">
    <rect width="10" height="20" fill="#009246" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#ce2b37" />
  </svg>
);
const Uae = () => (
  <svg className="tb-flag" viewBox="0 0 30 20" aria-hidden="true">
    <rect width="30" height="20" fill="#fff" /><rect width="30" height="6.67" fill="#00732f" /><rect y="13.33" width="30" height="6.67" fill="#000" /><rect width="8" height="20" fill="#f00" />
  </svg>
);

/** "Genuine parts · Modena & Dubai · Worldwide delivery" with icons, flags and a small Modena → Dubai route animation. */
export function TopbarPromo() {
  return (
    <span className="tb-promo">
      <span className="tb-item">
        <svg className="tb-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 4.5 5.5v5.6c0 4.5 3.1 8.6 7.5 10 4.4-1.4 7.5-5.5 7.5-10V5.5L12 2.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m8.6 11.8 2.4 2.4 4.5-4.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <T>Genuine parts</T>
      </span>
      <span className="tb-item tb-route">
        <Italy /><span>Modena</span>
        <span className="tb-line" aria-hidden="true"><i /></span>
        <Uae /><span>Dubai</span>
      </span>
      <span className="tb-item">
        <svg className="tb-ico tb-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        <T>Worldwide delivery</T>
      </span>
    </span>
  );
}
