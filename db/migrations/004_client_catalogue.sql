-- Client store catalogue (Autovivo). Its part numbers and fitment lists are
-- shown as "publicly_listed" until checked against an authorized Ferrari source.
ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'client_catalogue';

ALTER TABLE parts
  ADD COLUMN listing_url text CHECK (listing_url IS NULL OR listing_url ~ '^https://'),
  ADD COLUMN image_url   text CHECK (image_url IS NULL OR image_url ~ '^https://');
