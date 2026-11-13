-- Catalog schema with per-row provenance.
-- Rule: unknown values stay NULL. Nothing is "verified" without an authorized source.

CREATE TYPE verification_status AS ENUM (
  'verified',          -- confirmed against an authorized / licensed source for the stated scope
  'publicly_listed',   -- appears in a public, non-authorized source (e.g. retailer index)
  'unverified',        -- entered but not yet checked
  'source_required',   -- placeholder row: the value needs an authorized source
  'disputed'           -- sources conflict; do not display as fact
);

CREATE TYPE source_type AS ENUM (
  'oem_authorized',            -- Ferrari / authorized dealer catalog or TechInfo
  'licensed_third_party',      -- data licensed for this use
  'manufacturer_publication',  -- public Ferrari publication (press, prospectus)
  'public_retailer_index',     -- public retailer pages (not authorized)
  'project_classification'     -- grouping decided by this project, not OEM
);

CREATE TABLE sources (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title                text NOT NULL,
  publisher            text NOT NULL,
  source_type          source_type NOT NULL,
  url                  text,
  license_notes        text,
  access_requirements  text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  make         text NOT NULL,
  model        text NOT NULL,
  market       text,                 -- e.g. 'USA' when the source is market-specific
  summary      text,
  is_active    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Reusable provenance columns are spelled out per table for clarity.
CREATE TABLE vehicle_facts (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id           bigint NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  label                text NOT NULL,
  value                text NOT NULL,
  sort_order           int NOT NULL DEFAULT 0,
  source_id            bigint NOT NULL REFERENCES sources(id),
  source_ref           text,
  checked_on           date,
  scope_note           text,
  verification_status  verification_status NOT NULL DEFAULT 'unverified'
);

CREATE TABLE model_years (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id           bigint NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  year                 int NOT NULL CHECK (year BETWEEN 1940 AND 2100),
  source_id            bigint REFERENCES sources(id),
  source_ref           text,
  checked_on           date,
  scope_note           text,
  verification_status  verification_status NOT NULL DEFAULT 'unverified',
  UNIQUE (vehicle_id, year)
);

CREATE TABLE vehicle_systems (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name        text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  source_id   bigint NOT NULL REFERENCES sources(id)
);

CREATE TABLE assemblies (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id           bigint NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  system_id            bigint REFERENCES vehicle_systems(id),
  code                 text NOT NULL,
  name                 text NOT NULL,
  summary              text,
  source_id            bigint NOT NULL REFERENCES sources(id),
  source_ref           text,
  checked_on           date,
  scope_note           text,
  verification_status  verification_status NOT NULL DEFAULT 'unverified',
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, code)
);

CREATE TABLE parts (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  oem_part_number      text,          -- NULL until an authorized source provides it
  name                 text NOT NULL,
  description          text,
  revision             text,
  source_id            bigint NOT NULL REFERENCES sources(id),
  source_ref           text,
  checked_on           date,
  scope_note           text,
  verification_status  verification_status NOT NULL DEFAULT 'unverified',
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX parts_oem_number_uq ON parts (oem_part_number) WHERE oem_part_number IS NOT NULL;

CREATE TABLE assembly_parts (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assembly_id          bigint NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  part_id              bigint NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  quantity             int CHECK (quantity IS NULL OR quantity > 0),
  diagram_ref          text,          -- callout number on the source diagram
  source_id            bigint NOT NULL REFERENCES sources(id),
  source_ref           text,
  checked_on           date,
  verification_status  verification_status NOT NULL DEFAULT 'unverified',
  UNIQUE (assembly_id, part_id, diagram_ref)
);

CREATE TABLE part_specs (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  part_id              bigint NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  spec_key             text NOT NULL,
  spec_value           text NOT NULL,
  unit                 text,
  source_id            bigint NOT NULL REFERENCES sources(id),
  source_ref           text,
  checked_on           date,
  scope_note           text,
  verification_status  verification_status NOT NULL DEFAULT 'unverified'
);

CREATE TABLE fitments (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  part_id              bigint NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  vehicle_id           bigint NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  model_year_id        bigint REFERENCES model_years(id),
  market               text,
  vin_from             text CHECK (vin_from IS NULL OR vin_from ~ '^[A-HJ-NPR-Z0-9]{1,17}$'),
  vin_to               text CHECK (vin_to IS NULL OR vin_to ~ '^[A-HJ-NPR-Z0-9]{1,17}$'),
  notes                text,
  source_id            bigint NOT NULL REFERENCES sources(id),
  source_ref           text,
  checked_on           date,
  verification_status  verification_status NOT NULL DEFAULT 'unverified'
);

CREATE TYPE license_status AS ENUM ('none', 'pending_review', 'licensed_verified', 'rejected');
CREATE TYPE asset_kind AS ENUM ('model_3d', 'image', 'diagram');

CREATE TABLE media_assets (
  id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id                bigint NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind                      asset_kind NOT NULL,
  title                     text NOT NULL,
  url                       text,
  licensor                  text,
  license_name              text,
  license_url               text,
  license_status            license_status NOT NULL DEFAULT 'none',
  commercial_use_permitted  boolean,       -- NULL = not yet established
  is_real_vehicle_geometry  boolean,       -- NULL = not yet established
  source_id                 bigint REFERENCES sources(id),
  notes                     text,
  approved_at               timestamptz,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Maps named meshes inside a licensed 3D asset to catalog records.
CREATE TABLE asset_mesh_bindings (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id     bigint NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  mesh_name    text NOT NULL,
  assembly_id  bigint REFERENCES assemblies(id) ON DELETE SET NULL,
  part_id      bigint REFERENCES parts(id) ON DELETE SET NULL,
  explode_x    double precision,   -- offset from the asset's own assembly metadata
  explode_y    double precision,
  explode_z    double precision,
  notes        text,
  UNIQUE (asset_id, mesh_name)
);

-- What is missing and what access/licence would unblock it. Shown publicly.
CREATE TABLE data_gaps (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id     bigint NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  area           text NOT NULL,
  missing        text NOT NULL,
  access_needed  text NOT NULL,
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  sort_order     int NOT NULL DEFAULT 0
);

CREATE INDEX assemblies_vehicle_idx ON assemblies (vehicle_id, system_id);
CREATE INDEX assembly_parts_part_idx ON assembly_parts (part_id);
CREATE INDEX fitments_part_idx ON fitments (part_id);
CREATE INDEX part_specs_part_idx ON part_specs (part_id);
