CREATE TABLE admin_users (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email          text NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Only a SHA-256 of the session token is stored.
CREATE TABLE admin_sessions (
  token_hash  bytea PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_sessions_expiry_idx ON admin_sessions (expires_at);

CREATE TABLE audit_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  bigint,
  payload    jsonb,
  at         timestamptz NOT NULL DEFAULT now()
);

-- Quote requests are stored for manual follow-up. No pricing, stock or payment.
CREATE TABLE quote_requests (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL,
  vin         text CHECK (vin IS NULL OR vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  message     text,
  items       jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'closed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
