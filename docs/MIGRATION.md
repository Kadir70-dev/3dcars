# Migration plan — static prototype → Next.js + Go + PostgreSQL

Status: proposed and implemented on branch `feature/ferrari-milestone-stack` (not merged).

## Starting point (main @ 88c674e)

A single static `index.html` with:

| Behaviour | Kept? | Where it lives now |
|---|---|---|
| 95 public assembly-group titles (Eurospares 488 GTB USA index) | Yes — as seed data with provenance | `db/seed/001_ferrari_488_gtb.sql` |
| Code-range → "system" grouping (`categoryFor`) | Yes — explicitly labelled a *project classification*, not OEM data | `vehicle_systems` table + seed |
| Ferrari prospectus model facts | Yes — re-checked against the PDF on 2026-11-14 | `vehicle_facts` table + seed |
| Search / filter over groups | Yes — server-side, URL-addressable | Go `/api/v1/search`, Next `/catalog` |
| Selectable systems + detail panel | Yes | Next `/vehicles/ferrari-488-gtb` |
| Original side-view schematic SVG | Yes — still labelled "illustrative schematic, not OEM geometry" | `web/components/Schematic.tsx` |
| Browser-local shortlist | Yes — extended to a quote request that is stored, never priced | `web/lib/shortlist.ts`, Go `POST /api/v1/quotes` |
| Accuracy notes, source links, non-affiliation notice | Yes — on every page footer and detail view | `web/components/*` |

The original file is preserved verbatim at `legacy/prototype.html` (moved with `git mv`, history intact).

## Target layout

```
db/migrations/   PostgreSQL schema (plain SQL, applied in order)
db/seed/         Provenance-tagged seed data (only sourced facts)
api/             Go 1.22 HTTP API (net/http + pgx), admin auth, tests
web/             Next.js (App Router) public site + admin UI
legacy/          Original static prototype, untouched
docs/            Migration plan, data gaps, scope & budget notes
```

## Safety rules applied during migration

1. No value enters the database without a `source_id`; unknown values stay `NULL`.
2. Every provenance-bearing row carries `verification_status`, `source_ref`, `checked_on`, `scope_note`.
3. Assembly groups are `publicly_listed`, never `verified` — a retailer index is not an authorized Ferrari source.
4. 3D assets render only when `license_status = 'licensed_verified'` **and** `commercial_use_permitted = true` **and** `is_real_vehicle_geometry` is set honestly. No asset is seeded.
5. Quote requests are stored for follow-up only. No prices, stock, payment or checkout exist.
6. Ferrari 488 GTB is the only `is_active` vehicle. Lamborghini / Maserati are not created.

## Steps (one commit each)

1. Move prototype to `legacy/`, add this plan, docker-compose for local Postgres.
2. Schema + provenance seed.
3. Go API (public read, search, quotes, admin auth + CRUD) with tests.
4. Next.js public experience (home, explorer, catalog, quote, sources).
5. Admin CMS UI.
6. 3D viewer pipeline gated on licensed assets, with an abstract test fixture.
7. Docs: data gaps, scope vs. budget, runbook.
