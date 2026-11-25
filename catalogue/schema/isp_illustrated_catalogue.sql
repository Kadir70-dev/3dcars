-- Interactive Spares illustrated catalogue (Autovivo Parts) - DEVELOPMENT schema.
-- PostgreSQL-compatible. Lives in its own schema "isp" so it never touches the
-- production "public" tables and stays separate from other price sources
-- (e.g. FerrariParts UK) for later comparison. Not applied to any database yet.
CREATE SCHEMA IF NOT EXISTS isp;

CREATE TABLE isp.engine_group (
  engine_group_id serial PRIMARY KEY,
  name            text NOT NULL UNIQUE,
  slug            text NOT NULL UNIQUE
);
CREATE TABLE isp.vehicle (                       -- catalogue "model"
  vehicle_id      text PRIMARY KEY,              -- portal model id
  engine_group_id int  NOT NULL REFERENCES isp.engine_group,
  name            text NOT NULL,
  slug            text NOT NULL,
  source_url      text,
  UNIQUE (engine_group_id, slug)
);
CREATE TABLE isp.assembly (                      -- one plate
  assembly_id     text PRIMARY KEY,
  vehicle_id      text NOT NULL REFERENCES isp.vehicle,
  plate_code      text NOT NULL,
  assembly_number text,
  name            text NOT NULL,
  slug            text NOT NULL,
  source_url      text,
  extracted_at    timestamptz,
  UNIQUE (vehicle_id, slug)
);
CREATE TABLE isp.diagram (                       -- URL + status only; files are authorization-gated
  diagram_id      serial PRIMARY KEY,
  assembly_id     text NOT NULL REFERENCES isp.assembly,
  source_url      text NOT NULL,
  format          text NOT NULL DEFAULT 'svg',
  local_path      text,                          -- NULL until reproduction is authorized
  authorized      boolean NOT NULL DEFAULT false,
  sha256          text,
  UNIQUE (assembly_id, source_url)
);
CREATE TABLE isp.part (                          -- unique OEM number
  part_number     text PRIMARY KEY,
  description     text,
  uom             text,
  image_url       text,
  first_seen      timestamptz,
  last_seen       timestamptz
);
CREATE TABLE isp.diagram_reference (             -- numbered callout -> part, per assembly
  assembly_id     text NOT NULL REFERENCES isp.assembly,
  ref_no          text NOT NULL,                 -- number printed on the diagram
  part_number     text NOT NULL REFERENCES isp.part,
  quantity        numeric,
  specification   text,
  purchasable     boolean,
  price_on_request boolean,
  availability_flag text,                        -- raw portal flag, meaning unverified
  superseded_by   text,
  PRIMARY KEY (assembly_id, ref_no, part_number)
);
CREATE INDEX ON isp.diagram_reference (part_number);
CREATE TABLE isp.price (                         -- original EUR as shown, history kept
  part_number     text NOT NULL REFERENCES isp.part,
  amount          numeric(12,2),
  currency        char(3) NOT NULL DEFAULT 'EUR',
  source          text NOT NULL DEFAULT 'interactive_spares',
  observed_at     timestamptz NOT NULL,
  source_assembly text,
  PRIMARY KEY (part_number, source, observed_at)
);
CREATE TABLE isp.vehicle_part (                  -- compatibility
  vehicle_id      text NOT NULL REFERENCES isp.vehicle,
  part_number     text NOT NULL REFERENCES isp.part,
  PRIMARY KEY (vehicle_id, part_number)
);
