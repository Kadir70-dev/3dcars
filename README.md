# 3dcars — Ferrari 488 GTB parts atlas

First milestone for the automotive parts research experience: Ferrari 488 GTB.
Lamborghini and Maserati are **not started** until the Ferrari milestone is reviewed.

## Stack

| Part | Path | Notes |
|---|---|---|
| Frontend | `web/` | Next.js 16 (App Router), three.js viewer |
| API | `api/` | Go 1.22, `net/http` + pgx |
| Database | `db/` | PostgreSQL 16 — migrations + provenance seed |
| Original prototype | `legacy/prototype.html` | Untouched static version |

See [docs/MIGRATION.md](docs/MIGRATION.md) for how the prototype maps to the new stack.

## What works

- Explorer: schematic navigation, assembly search/filter by name, number and system, synced detail panel with provenance.
- Catalog search page (server-rendered, shareable URLs) for parts and assemblies.
- Part detail page (specs, fitment, assembly membership), shown once parts exist.
- Quote list (browser-local) and quote request form (stored for manual follow-up — no pricing/checkout).
- Sources & data-gaps page.
- Admin CMS: sign-in, create/edit/delete for sources, vehicles, facts, model years, assemblies, parts, links, specs, fitments, media/3D assets, mesh bindings, data gaps, quote status.
- Vehicle portfolio on the home page: Ferrari 488 GTB card opens the explorer; Lamborghini/Maserati shown as not started.
- 3D workbench driven by licensed-asset mesh bindings: rotate, zoom, two-way sync between model and parts list,
  isolate, hide/show, frame, reset, and step-by-step or selected-assembly-only disassembly (`explode_step`).
  Exercised on `/dev/viewer-fixture` with abstract shapes and test labels (not a vehicle).
- Asset intake check: `./bin/atlas-api glb-meshes model.glb` lists named mesh nodes and prints draft bindings
  (no assembly, part or offsets filled in). A model is public only if its `mesh_node_count` is at least 2, so a
  single-mesh car cannot drive the explorer.

## Accuracy rules (enforced in the API)

- Assembly group titles are `publicly_listed` (public retailer index), never `verified`.
- `verified` is refused unless the source is OEM-authorized or licensed (manufacturer publications can verify model-level facts only).
- A 3D asset is shown only with a verified commercial licence, licensor, licence name and an approval date.
- Only the Ferrari 488 GTB may be an active vehicle.
- No parts, specs, fitments, model years or 3D assets are seeded — they require authorized/licensed sources.

## Run locally

```bash
docker compose up -d --wait                       # Postgres on 127.0.0.1:5440

cd api
export DATABASE_URL=postgres://atlas:atlas_dev_only@127.0.0.1:5440/atlas
go build -o bin/atlas-api ./cmd/atlas-api
./bin/atlas-api migrate                           # schema + seed
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='12+ chars' ./bin/atlas-api create-admin
./bin/atlas-api serve                             # http://127.0.0.1:8088

cd ../web
npm ci
npm run dev                                       # http://localhost:3020
```

## Checks

```bash
cd api && go vet ./... && TEST_ADMIN_DATABASE_URL=postgres://atlas:atlas_dev_only@127.0.0.1:5440/postgres go test ./...
cd web && npm run typecheck && npm run lint && npm test && npm run build
```

## Sources

- Ferrari prospectus: https://cdn.ferrari.com/cms/network/media/pdf/ferrari_prospectus_-_final_version_-_14.3.2016.pdf
- Ferrari TechInfo: https://techinfo.ferrari.com/
- Public 488 GTB (USA) diagram index: https://www.eurospares.com/ferrari/488/488-gtb-usa/part-diagrams

Independent project — not affiliated with, endorsed by, or sponsored by Ferrari.
Remaining OEM-data, VIN and licensing work is listed in [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md) and on the site's Sources page.
