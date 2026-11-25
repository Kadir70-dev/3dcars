# Autovivo premium redesign

Branch `feature/premium-ui-redesign` (from the live dark-theme code). Frontend only; no backend, data, SEO or URL changes.

## Reference analysis (computed styles, 1440px)
- **Ferrari**: white/black surfaces, 13px uppercase-tracked nav, full-bleed cinematic hero, hairline buttons, lots of whitespace. Adopted: restraint, whitespace, image-led editorial section, quiet transitions.
- **Lamborghini**: 120px condensed uppercase display type, dark hero, angular CTA, 0.25rem spacing scale. Adopted: condensed display headings, clip-path corners, hard hierarchy, hamburger/drawer pattern.
- No proprietary fonts, code or media used. Display = Barlow Condensed, text = Manrope, labels = DM Mono (all open licence).

## Design system (`web/app/design-system.css`)
Tokens: obsidian #0D0D0D, carbon #191919, graphite #292929, platinum #E5E5E5, ivory #F7F7F5, rosso #D6203C (existing brand accent). Fluid type via `clamp()`, spacing scale `--sp-*`, geometry `--clip-card/--clip-btn/--clip-slant`, motion `--ease-lux`, `--t-*`.
Components: `.btn`, `.hdr-search`, `.mega`, `.drawer`, `.marque`, `.cat-grid`, `.editorial`, `.shop/.filters`, `.product.elite`, `.product-meta`, `.stats`.
Motion: CSS scroll-driven reveal/parallax (no GSAP needed), full `prefers-reduced-motion` support.

## Changed
`app/design-system.css` (new), `app/layout.tsx`, `app/page.tsx`, `app/store/page.tsx`, `components/Chrome.tsx`, `components/HomeVideo.tsx`, `components/FilterPanel.tsx` (new). Part, catalogue, contact, quote, preorder, explorer pages inherit via tokens.

## QA
Screenshots: `before/` and `after/` (390, 430, 768, 834, 1280, 1440, 1920). Lint 0 errors, 14/14 tests, tsc clean, production build OK. Baseline had 1-2px overflow on /store and /catalog at 1280 (fixed with `overflow-x: clip`).
Known pre-existing: `/videos/hero.mp4` is missing (404 on the live site too; poster photo is shown).
