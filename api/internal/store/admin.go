package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Kadir70-dev/3dcars/api/internal/resources"
)

// ErrConflict wraps constraint violations (unique / FK / check).
var ErrConflict = errors.New("conflict")

func columns(r resources.Resource) []string {
	cols := []string{"id"}
	for _, f := range r.Fields {
		c := f.Name
		if f.Cast != "" {
			c += "::text"
		}
		cols = append(cols, c+" AS "+f.Name)
	}
	return cols
}

// List returns up to 500 rows of a resource as generic maps.
func (s *Store) List(ctx context.Context, r resources.Resource) ([]map[string]any, error) {
	rows, err := s.DB.Query(ctx, fmt.Sprintf("SELECT %s FROM %s ORDER BY %s LIMIT 500",
		strings.Join(columns(r), ", "), r.Table, r.ListOrder))
	if err != nil {
		return nil, err
	}
	out, err := pgx.CollectRows(rows, pgx.RowToMap)
	if out == nil {
		out = []map[string]any{}
	}
	return out, err
}

// Options returns id/label pairs for reference pickers.
func (s *Store) Options(ctx context.Context, resource string) ([]map[string]any, error) {
	labels := map[string]string{
		"sources":         "title",
		"vehicles":        "make || ' ' || model",
		"vehicle_systems": "name",
		"assemblies":      "code || ' · ' || name",
		"parts":           "coalesce(oem_part_number || ' · ', '') || name",
		"model_years":     "year::text",
		"media_assets":    "title",
	}
	expr, ok := labels[resource]
	if !ok {
		return nil, ErrNotFound
	}
	rows, err := s.DB.Query(ctx, fmt.Sprintf("SELECT id, %s AS label FROM %s ORDER BY 2 LIMIT 1000", expr, resource))
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToMap)
}

func (s *Store) checkVerified(ctx context.Context, tx pgx.Tx, r resources.Resource, v map[string]any) error {
	if v["verification_status"] != "verified" {
		return nil
	}
	var st string
	if err := tx.QueryRow(ctx, `SELECT source_type::text FROM sources WHERE id=$1`, v["source_id"]).Scan(&st); err != nil {
		return resources.ValidationError{"source_id": "unknown source"}
	}
	if !resources.VerifiedAllowed(r.Name, st) {
		return resources.ValidationError{"verification_status": "a " + st + " source cannot mark this record verified"}
	}
	return nil
}

func sortedKeys(v map[string]any) []string {
	keys := make([]string, 0, len(v))
	for k := range v {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func castFor(r resources.Resource, col string) string {
	for _, f := range r.Fields {
		if f.Name == col && f.Cast != "" {
			return "::" + f.Cast
		}
	}
	return ""
}

func mapPgErr(err error) error {
	var pg *pgconn.PgError
	if errors.As(err, &pg) && (strings.HasPrefix(pg.Code, "23")) {
		return fmt.Errorf("%w: %s", ErrConflict, pg.Message)
	}
	return err
}

// Save inserts (id==0) or updates a row after policy checks, and audits it.
func (s *Store) Save(ctx context.Context, userID int64, r resources.Resource, id int64, v map[string]any) (int64, error) {
	if err := resources.CheckPolicy(r.Name, v); err != nil {
		return 0, err
	}
	action := "update"
	if id == 0 {
		action = "create"
	}
	err := pgx.BeginFunc(ctx, s.DB, func(tx pgx.Tx) error {
		if err := s.checkVerified(ctx, tx, r, v); err != nil {
			return err
		}
		keys := sortedKeys(v)
		args := make([]any, 0, len(keys)+1)
		var sql string
		if id == 0 {
			ph := make([]string, len(keys))
			for i, k := range keys {
				ph[i] = fmt.Sprintf("$%d%s", i+1, castFor(r, k))
				args = append(args, v[k])
			}
			sql = fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id", r.Table, strings.Join(keys, ", "), strings.Join(ph, ", "))
		} else {
			set := make([]string, len(keys))
			for i, k := range keys {
				set[i] = fmt.Sprintf("%s=$%d%s", k, i+1, castFor(r, k))
				args = append(args, v[k])
			}
			args = append(args, id)
			sql = fmt.Sprintf("UPDATE %s SET %s WHERE id=$%d RETURNING id", r.Table, strings.Join(set, ", "), len(args))
		}
		if err := tx.QueryRow(ctx, sql, args...).Scan(&id); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrNotFound
			}
			return mapPgErr(err)
		}
		return audit(ctx, tx, userID, action, r.Name, id, v)
	})
	return id, err
}

func (s *Store) Delete(ctx context.Context, userID int64, r resources.Resource, id int64) error {
	return pgx.BeginFunc(ctx, s.DB, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, fmt.Sprintf("DELETE FROM %s WHERE id=$1", r.Table), id)
		if err != nil {
			return mapPgErr(err)
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
		return audit(ctx, tx, userID, "delete", r.Name, id, nil)
	})
}

func audit(ctx context.Context, tx pgx.Tx, userID int64, action, entity string, id int64, payload map[string]any) error {
	var b []byte
	if payload != nil {
		b, _ = json.Marshal(payload)
	}
	_, err := tx.Exec(ctx, `INSERT INTO audit_log (user_id, action, entity, entity_id, payload) VALUES ($1,$2,$3,$4,$5)`,
		userID, action, entity, id, b)
	return err
}
