-- Brand and the client's "FIT" lines for store-catalogue parts. FIT lines are kept
-- verbatim as listed by the client; they are not verified fitment records.
ALTER TABLE parts
  ADD COLUMN brand text CHECK (brand IS NULL OR brand IN ('Ferrari', 'Lamborghini', 'Maserati')),
  ADD COLUMN fit_models text[] NOT NULL DEFAULT '{}';
CREATE INDEX parts_brand_idx ON parts (brand) WHERE brand IS NOT NULL;
