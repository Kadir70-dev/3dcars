# isp_scraper — Interactive Spares catalogue extractor (read-only)

Extracts the catalogue visible to our authorized account on
`cloud.interactivespares.com/microcom` into SQLite, CSV and Excel.

**Status: full extraction COMPLETE (2026-11-25: 55 models, 5,909 plates, 240,731 rows, 85,229 unique OEMs).
Bulk extraction ran under the user's confirmed permission; commercial publication and diagram downloads
remain GATED on written authorization.** Every diagram on the portal carries
"reproduction ... for private or commercial purposes ... is not permitted unless
authorized in writing by Ferrari S.p.A." Obtain that permission (or the portal
operator's, Zanasi Group / Interactive Spares) before the full run or publishing.

## Setup
```bash
cd ~/3dcars/scripts/isp_scraper
python3 -m venv .venv && .venv/bin/pip install playwright openpyxl
.venv/bin/playwright install chromium   # skip if a chromium build is already cached
read -rs ISP_PASS; export ISP_PASS; export ISP_USER='<portal user>'
.venv/bin/python isp_scraper.py login   # writes auth/session.json (mode 600, gitignored)
unset ISP_PASS
```

## Commands
```bash
.venv/bin/python isp_scraper.py models                      # 4 groups -> 55 models
.venv/bin/python isp_scraper.py crawl --scope sample        # 2 models x 5 plates (default)
.venv/bin/python isp_scraper.py crawl --model "488 GTB" --max-models 1 --max-plates 3
.venv/bin/python isp_scraper.py export                      # CSV + XLSX from the DB
.venv/bin/python isp_scraper.py report                      # extraction_report.json
```

## Full extraction (ONLY after written authorization)
```bash
echo "<reference to written permission, who/when>" > auth/bulk_authorization.txt
nohup .venv/bin/python isp_scraper.py crawl --scope full --delay 1.5 \
      --i-confirm-bulk-authorization > logs/full.out 2>&1 &
```
Resumable: re-run the same command and finished plates are skipped (`--refresh` re-fetches).
Exit codes: 3 = session expired (run `login`, then re-run), 4 = access restriction, 5 = gate not satisfied.

## How it works
Hierarchy: group -> model (catalogue) -> assembly plate -> parts rows.
- Models: `categorie/<group>`; client-side pagination, so a browser clicks the pager (only step using a browser).
- Plates: `GET catalogo/<id>/tree?parent=#` (JSON). Parts: `POST catalogo/<id>/tree/tavola/<node>` (HTML rows).
- Plain HTTP with the saved session; 1.5 s + jitter between requests; backoff on 429/5xx.
- Hard-blocked paths: carrello, ordini, profilo, logout, aggiungi, aggiorna, password, register. No orders, no writes.
- Diagrams and part images are stored as URLs only; the files are not downloaded.

## Data
Raw rows are kept verbatim in `assembly_parts.raw_row`; `parts`, `model_parts`, `price_history` are the normalized layer.
Tables: models, assemblies, parts, assembly_parts, model_parts, price_history, checkpoint, errors.
Price history appends only when a price changes.

Available: OEM part number, description, specification, UM, quantity, diagram ref, assembly number/name,
price (EUR), purchasable / price-on-request flags, stock flag, superseded-by, kit link, image + diagram URLs.
Not exposed by the portal: VAT, dealer-vs-retail split, stock quantity, manufacturing year, per-part compatibility lists
(model compatibility is derived from the crawl; `catalogo-comp/ricambio?code=` returns where-used per part if needed).
`stock_flag` is the button's `data-magazzino` value (0/1); its exact meaning is unverified.

## Estimate (from tree calls, 2026-11-25)
55 models, 5,909 plates (6 cyl 448, 8 cyl 3,078, 12 cyl 2,258, Challenge 125),
about 31.6 rows/plate in sample, so roughly 187k part rows; about 3 h at the default rate.


## Final exports, validation and refreshes (from the completed database - no new crawl needed)
```bash
.venv/bin/python export_fast.py          # CSV + XLSX + extraction_report.json in ~3 min (single pass, no per-row queries)
.venv/bin/python build_catalogue.py      # ../../catalogue tree, metadata, relational CSVs, diagram_part_mapping.json
.venv/bin/python validate_exports.py     # cross-checks SQLite/CSV/XLSX/JSON/catalogue counts -> validation_report.json
```
Do not use `isp_scraper.py export` for large databases: its per-row subqueries took 30+ min without finishing.
Original portal prices (including 0.00) are preserved in every file; the storefront shows "Request Price" for 0.

### Incremental price refresh (price_history appends a row only when a price changes)
```bash
read -rs ISP_PASS; export ISP_PASS ISP_USER='<portal user>'; .venv/bin/python isp_scraper.py login; unset ISP_PASS
.venv/bin/python isp_scraper.py crawl --scope full --refresh --delay 1.5 --i-confirm-bulk-authorization   # all plates, ~3 h
.venv/bin/python isp_scraper.py crawl --scope full --refresh --model "F8" --i-confirm-bulk-authorization  # one model family
.venv/bin/python export_fast.py && .venv/bin/python build_catalogue.py && .venv/bin/python validate_exports.py
```
Keep Interactive Spares prices separate from other sources (e.g. FerrariParts UK): the `isp.price.source` column
in `catalogue/schema/isp_illustrated_catalogue.sql` exists for that comparison.

### Diagrams (gated)
`fetch_diagrams.py` refuses to run without `auth/diagram_authorization.txt` (reference to Ferrari S.p.A. written
reproduction permission) and `--i-confirm-diagram-authorization`. After download it runs `extract_hotspots.py`
(offline) to write `hotspots.json` per assembly. Nothing under `catalogue/` is ever committed.
