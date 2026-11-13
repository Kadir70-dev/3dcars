# Claude handoff — Ferrari-first implementation

Continue this repository; do not treat the current schematic as real Ferrari geometry or the 95 assembly groups as an individual spare-parts inventory.

## Inspect first

1. Review `index.html` and the current `main` branch before editing.
2. Preserve the source links and data-accuracy warnings.
3. Work on Ferrari 488 GTB first. Do not start Lamborghini or Maserati.

## Highest-priority remaining work

1. **Source complete part-level data.** The public Eurospares page is an assembly-group index. Obtain an authorized, licensed, VIN/model-year-specific Ferrari parts source before claiming individual OEM names, numbers, quantity, material, measurements, revisions, or fitment. Do not scrape restricted pages, bypass access, or fabricate missing values.
2. **Real vehicle 3D.** Integrate a genuinely licensed Ferrari 488 GTB model and real assembly geometry only after confirming its license permits this commercial use. Do not buy or subscribe without Abdul Kadir's approval. Until supplied, keep the schematic disclaimer visible.
3. **3D interactions.** Implement model rotation/zoom, exploded assembly states, selectable mesh hotspots, accessible part-list selection, and synchronized part details. Use a real asset's named meshes/metadata; do not label placeholder shapes as real parts.
4. **Stack and backend.** The current repository contains a static HTML prototype only. For the full product, use Next.js frontend, Go API, and PostgreSQL. Define a provenance-aware schema for vehicles, model years, assemblies, parts, source records, and fitments. Keep unknown values null/unverified.
5. **Admin and commerce.** Add an authenticated admin CMS for catalog/source/asset management. Keep quote/cart/checkout inactive until inventory, pricing, privacy/legal content, and payment setup are provided.
6. **Verification and release.** Add accessible interactions, mobile layouts, search/filter behavior, and source links. Run project checks once the proper stack is implemented. Do not publish or buy assets without approval.

## Verified starting references

- Ferrari's 2016 prospectus describes the 488 GTB as a two-seat berlinetta with a 3,902 cc mid-rear turbo V8, 670 hp, and a 0–200 km/h time of 8.3 seconds; launched March 2015.
- Public Eurospares index lists 95 assembly groups for the 488 GTB (USA), not every individual spare part.
- Ferrari TechInfo is the authorized technical-information entry point; actual access/licensing and exact VIN fitment remain to be obtained.

Links:
- https://cdn.ferrari.com/cms/network/media/pdf/ferrari_prospectus_-_final_version_-_14.3.2016.pdf
- https://techinfo.ferrari.com/
- https://www.eurospares.com/ferrari/488/488-gtb-usa/part-diagrams
