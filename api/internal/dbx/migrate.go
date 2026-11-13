// Package dbx holds database connection and migration helpers.
package dbx

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pgx pool and verifies connectivity.
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

// ApplyDir applies every *.sql file in dir (sorted by name) that is not yet
// recorded in schema_migrations under the given prefix. Each file runs in its
// own transaction.
func ApplyDir(ctx context.Context, pool *pgxpool.Pool, dir, prefix string) ([]string, error) {
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`); err != nil {
		return nil, err
	}
	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	var applied []string
	for _, f := range files {
		version := prefix + "/" + filepath.Base(f)
		var exists bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version=$1)`, version).Scan(&exists); err != nil {
			return applied, err
		}
		if exists {
			continue
		}
		body, err := os.ReadFile(f)
		if err != nil {
			return applied, err
		}
		// Seed files manage their own BEGIN/COMMIT; strip them so we can wrap.
		sql := strings.NewReplacer("\nBEGIN;\n", "\n", "\nCOMMIT;\n", "\n").Replace("\n" + string(body))
		err = pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, sql); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version)
			return err
		})
		if err != nil {
			return applied, fmt.Errorf("%s: %w", version, err)
		}
		applied = append(applied, version)
	}
	return applied, nil
}
