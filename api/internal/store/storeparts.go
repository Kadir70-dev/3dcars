package store

import (
	"context"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

// StorePart is a part listed in the client's store catalogue (any brand).
type StorePart struct {
	PartSummary
	Brand     *string  `json:"brand"`
	FitModels []string `json:"fitModels"`
}

// StoreQuery filters the store catalogue. Values are validated by the HTTP layer.
type StoreQuery struct {
	Brand, Query, Model string
	Limit, Offset       int
}

type ModelCount struct {
	Model string `json:"model"`
	Parts int    `json:"parts"`
}

type StoreResult struct {
	Parts  []StorePart    `json:"parts"`
	Total  int            `json:"total"`
	Brands map[string]int `json:"brands"`
	Models []ModelCount   `json:"models"`
}

const storeWhere = `FROM parts p JOIN parts x ON x.id=p.id JOIN sources s ON s.id=p.source_id
	WHERE s.source_type='client_catalogue' AND p.brand IS NOT NULL
	  AND ($1='' OR p.brand=$1)
	  AND ($2='' OR lower(p.name) LIKE $3 OR lower(coalesce(p.oem_part_number,'')) LIKE $3)
	  AND ($4='' OR EXISTS (SELECT 1 FROM unnest(p.fit_models) f WHERE upper(f) LIKE $5))`

// StoreParts searches the client catalogue and returns brand totals and the most
// common model names found in the listings' own FIT lines.
func (s *Store) StoreParts(ctx context.Context, q StoreQuery) (*StoreResult, error) {
	args := []any{q.Brand, q.Query, like(q.Query), q.Model, strings.ToUpper(like(q.Model))}
	res := &StoreResult{Brands: map[string]int{}, Parts: []StorePart{}, Models: []ModelCount{}}
	if err := s.DB.QueryRow(ctx, `SELECT count(*) `+storeWhere, args...).Scan(&res.Total); err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(ctx, `SELECT p.id, p.oem_part_number, p.name, p.listing_url, p.image_url, p.brand, p.fit_models, `+provCols+` `+storeWhere+`
		ORDER BY p.brand, p.name, p.id LIMIT $6 OFFSET $7`, append(args, q.Limit, q.Offset)...)
	if err != nil {
		return nil, err
	}
	res.Parts, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (StorePart, error) {
		var p StorePart
		err := r.Scan(append([]any{&p.ID, &p.OEMPartNumber, &p.Name, &p.ListingURL, &p.ImageURL, &p.Brand, &p.FitModels}, scanProv(&p.Provenance)...)...)
		return p, err
	})
	if err != nil {
		return nil, err
	}
	brows, err := s.DB.Query(ctx, `SELECT p.brand, count(*) FROM parts p JOIN sources s ON s.id=p.source_id
		WHERE s.source_type='client_catalogue' AND p.brand IS NOT NULL GROUP BY p.brand`)
	if err != nil {
		return nil, err
	}
	for brows.Next() {
		var b string
		var n int
		if err := brows.Scan(&b, &n); err != nil {
			brows.Close()
			return nil, err
		}
		res.Brands[b] = n
	}
	brows.Close()
	if err := brows.Err(); err != nil {
		return nil, err
	}
	res.Models, err = s.storeModels(ctx, q.Brand)
	return res, err
}

// storeModels counts parts per model word taken from FIT lines such as
// "FERRARI 488" or "LAMBORGHINI HURACAN (EUROPE)".
func (s *Store) storeModels(ctx context.Context, brand string) ([]ModelCount, error) {
	rows, err := s.DB.Query(ctx, `SELECT p.id, p.brand, f FROM parts p JOIN sources s ON s.id=p.source_id, unnest(p.fit_models) f
		WHERE s.source_type='client_catalogue' AND p.brand IS NOT NULL AND ($1='' OR p.brand=$1)`, brand)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	seen := map[string]map[int64]bool{}
	for rows.Next() {
		var id int64
		var b, f string
		if err := rows.Scan(&id, &b, &f); err != nil {
			return nil, err
		}
		if m := ModelWord(b, f); m != "" {
			if seen[m] == nil {
				seen[m] = map[int64]bool{}
			}
			seen[m][id] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := make([]ModelCount, 0, len(seen))
	for m, ids := range seen {
		out = append(out, ModelCount{Model: m, Parts: len(ids)})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Parts != out[j].Parts {
			return out[i].Parts > out[j].Parts
		}
		return out[i].Model < out[j].Model
	})
	if len(out) > 30 {
		out = out[:30]
	}
	return out, nil
}

var notModel = map[string]bool{"TO": true, "UP": true, "ALL": true, "AND": true, "FROM": true, "FOR": true, "WITH": true}

// ModelWord returns the model word of a FIT line ("FERRARI 488 GTB (USA)" → "488"),
// or "" when the line does not name one.
func ModelWord(brand, fit string) string {
	u := strings.ToUpper(strings.TrimSpace(fit))
	u = strings.TrimPrefix(u, strings.ToUpper(brand))
	fields := strings.Fields(u)
	// Skip a leading model year ("2016 HURACAN LP610" → "HURACAN").
	for len(fields) > 0 && len(fields[0]) == 4 && (strings.HasPrefix(fields[0], "19") || strings.HasPrefix(fields[0], "20")) && strings.Trim(fields[0], "0123456789") == "" {
		fields = fields[1:]
	}
	if len(fields) == 0 {
		return ""
	}
	w := strings.Trim(fields[0], "-–,.:")
	if len(w) < 2 || strings.HasPrefix(w, "(") || notModel[w] {
		return ""
	}
	for _, r := range w {
		if !(r >= 'A' && r <= 'Z' || r >= '0' && r <= '9') {
			return ""
		}
	}
	return w
}
