# Autovivo premium redesign — Ferrari × Lamborghini hybrid

Branch `feature/premium-ui-redesign`. Frontend only: no backend, data, pricing, URL or SEO changes.

## 1. Reference analysis (computed styles, headless Chrome, 1440px)
| | Ferrari | Lamborghini |
|---|---|---|
| Surface | white body, near-black header (#181818) | white body, black full-bleed hero |
| Type | proprietary sans, 13px, 0.195px tracking, uppercase nav | proprietary "LamboType", 120px uppercase H1 (condensed) |
| Hero | cinematic photo, hairline outlined CTAs | dark video, solid gold angular CTA, MENU + logo + search header |
| Spacing | generous whitespace | 0.25rem scale (`--scale-spacing-*`) |

Adopted from **Ferrari (40%)**: restraint, alternating light editorial bands (ivory), whitespace, cinematic imagery, quiet transitions.
Adopted from **Lamborghini (40%)**: condensed uppercase display type, clip-path angular corners, hard hierarchy, hamburger drawer, full-bleed video divider.
**Autovivo (20%)**: rosso accent, tricolore rule under the wordmark, OEM-part-number search in header and hero, enquiry-first commerce (prices on request — no invented prices/stock).
No proprietary fonts, code or media were used. Fonts: Barlow Condensed (display), Manrope (text), DM Mono (part numbers) — all OFL.

## 2. Design system (`web/app/design-system.css`)
- Tokens: `--obsidian #0D0D0D`, `--carbon #191919`, `--graphite #292929`, `--platinum #E5E5E5`, `--ivory #F7F7F5`, `--rosso #D6203C` (existing brand accent). Legacy tokens (`--bg`, `--panel`, `--text`…) are remapped so every older component inherits the system.
- Fluid type with `clamp()`: `--fs-display/h1/h2/h3/body/label`. Spacing scale `--sp-1…7`. Geometry `--clip-card/--clip-btn/--clip-slant`. Motion `--ease-lux`, `--t-fast/med/slow`.
- Components: `.btn`, `.hdr-search`, `.mega`, `.drawer`, `.home-slides`, `.video-breaker`, `.marque`, `.cat-grid`, `.editorial`, `.band.ivory`, `.steps`, `.shop/.filters`, `.product(.elite)`, `.product-meta`, `.related`, `.stats`, `.enq`, `.preorder`.
- Product photography: source photos are white-background studio shots → shown on studio-light tiles (`multiply`), crisp on the dark site.
- Motion: CSS scroll-driven reveals/parallax (no GSAP/Framer needed → no new JS weight), 3-second hero crossfade, `prefers-reduced-motion` honoured everywhere.

## 3. What changed
New: `app/design-system.css`, `components/FilterPanel.tsx`, `components/VideoBreaker.tsx`, `public/videos/breaker.mp4` (+poster, generated from the three site photos), WebP versions of the photos.
Modified: `app/layout.tsx`, `app/page.tsx`, `app/store/page.tsx`, `app/catalog/page.tsx`, `app/parts/[id]/page.tsx` (related spare parts), `components/Chrome.tsx` (mega menu, search, drawer, footer map on home only, "Contact us"), `components/HomeVideo.tsx` (3s photo slideshow), `components/FooterMap.tsx`, `components/PhotoSlideshow.tsx`, `lib/it.ts`.
All other routes (explorer, catalogue, contact, quote/enquiry, pre-order, sources, admin) inherit tokens and component rules.

## 4. Functional verification (Playwright, all pass, 0 JS errors)
Header search → results; brand filter; model filter; pagination; add to enquiry list → count + `/quote` lists item; part detail + related parts; mega menu hover/Escape/keyboard; enquiry form validation; hero search; mobile drawer; mobile filters toggle.
Note: the site has no cart/checkout/prices by design (enquiry flow, "price on request") — unchanged.

## 5. Responsive QA
All 10 routes (home, store, catalog, explorer, part, contact, quote, preorder, sources, admin) were swept at 390, 430, 768, 834, 1280, 1440, 1920: no horizontal overflow, no console/hydration errors. Baseline issues fixed: 1–3px overflow on /store and /catalog at 1280. Visual review was done on desktop and 390px for every page; fixes included header overflow on phones, collapsed burger, tiny stat numerals, mismatched centred headings, dark murky product photos, part-page image order on mobile.
Known and pre-existing: the old `/videos/hero.mp4` never existed in production (404) — the hero no longer references it.

## 6. Performance (mobile emulation 390px, 4× CPU, ~4G, median of 3, local production builds, webpack both)
| Route | | FCP | LCP | CLS | Transfer |
|---|---|---|---|---|---|
| Home | before | 816 ms | 816 ms | 0 | 1.19 MB |
| Home | after | 1012 ms | 1012 ms | 0 | **0.68 MB** (−43%, WebP photos) |
| Store | before | 1280 ms | 1420 ms | 0 | 463 KB |
| Store | after | 984 ms | 1776 ms | 0 | 438 KB |
| Part | before | 572 ms | 572 ms | 0 | 381 KB |
| Part | after | 576 ms | 576 ms | 0 | 386 KB |
Timings vary ±300 ms between runs on this machine; treat FCP/LCP as roughly equal. CLS is 0 everywhere. JS payload is unchanged (~513 KB). The breaker video (1 MB) is `preload="none"` and only plays while on screen.

## 7. Screenshots
`docs/redesign/before/` (old design, commit c7f4b10) and `docs/redesign/after/` — full-page, `<route>-desktop.jpg` (1440) and `<route>-mobile.jpg` (390).
