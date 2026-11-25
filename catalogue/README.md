# catalogue/ - Interactive Spares illustrated catalogue (development only)

    diagrams/<engine-group>/<model>/<assembly>/   metadata.json (+ diagram.svg ONLY after written authorization)
    metadata/                                     assemblies.json, vehicles.json, relational CSVs for PostgreSQL \copy
    exports/                                      diagram_part_mapping.json, coverage_report.json
    schema/isp_illustrated_catalogue.sql          PostgreSQL schema "isp" (not applied anywhere)

Build (read-only on the crawl database; run after the crawl is complete):

    cd scripts/isp_scraper
    .venv/bin/python build_catalogue.py            # tree, metadata, mapping JSON, coverage report

Diagram files: `fetch_diagrams.py` refuses to run without `auth/diagram_authorization.txt`
(reference of Ferrari S.p.A. written reproduction permission) AND `--i-confirm-diagram-authorization`.
Never commit diagram files; copyright notices must stay intact.
