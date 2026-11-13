# 3dcars — Ferrari 488 GTB parts atlas

First milestone for the automotive parts research experience: Ferrari 488 GTB.

## Current implementation

- Responsive, static browser prototype in `index.html`.
- Search and filter over 95 assembly-group titles from the public Eurospares Ferrari 488 GTB (USA) parts-diagram index.
- Clickable system schematic and selectable assembly-group details.
- Browser-local research shortlist.
- Ferrari model facts linked to the Ferrari prospectus.
- Explicit labels that the drawing is an original schematic, not Ferrari OEM geometry or a real exploded 3D CAD model.
- Explicit data-status labels: assembly-group names are indexed; individual part-level OEM specs and VIN fitment are not populated.

## Run locally

Open `index.html` in a modern browser. No build system is required for this prototype.

## Sources

- Ferrari prospectus: https://cdn.ferrari.com/cms/network/media/pdf/ferrari_prospectus_-_final_version_-_14.3.2016.pdf
- Ferrari TechInfo: https://techinfo.ferrari.com/
- Public 488 GTB (USA) diagram index: https://www.eurospares.com/ferrari/488/488-gtb-usa/part-diagrams

## Production work still needed

See [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md). The current prototype is not an online store, does not call a Go API, has no PostgreSQL database or admin CMS, and does not contain licensed vehicle CAD or a complete VIN-specific OEM spare-parts catalog.
