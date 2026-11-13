// Package store contains PostgreSQL queries for the catalog API.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Store struct{ DB *pgxpool.Pool }

// Provenance is attached to every sourced value returned by the API.
type Provenance struct {
	SourceID           int64      `json:"sourceId"`
	SourceTitle        string     `json:"sourceTitle"`
	SourceType         string     `json:"sourceType"`
	SourceURL          *string    `json:"sourceUrl"`
	SourceRef          *string    `json:"sourceRef"`
	CheckedOn          *time.Time `json:"checkedOn"`
	ScopeNote          *string    `json:"scopeNote"`
	VerificationStatus string     `json:"verificationStatus"`
}

type Vehicle struct {
	ID      int64   `json:"id"`
	Slug    string  `json:"slug"`
	Make    string  `json:"make"`
	Model   string  `json:"model"`
	Market  *string `json:"market"`
	Summary *string `json:"summary"`
}

type Fact struct {
	Label      string     `json:"label"`
	Value      string     `json:"value"`
	Provenance Provenance `json:"provenance"`
}

type System struct {
	Slug          string `json:"slug"`
	Name          string `json:"name"`
	AssemblyCount int    `json:"assemblyCount"`
}

type DataGap struct {
	Area         string `json:"area"`
	Missing      string `json:"missing"`
	AccessNeeded string `json:"accessNeeded"`
	Status       string `json:"status"`
}

type MeshBinding struct {
	MeshName     string      `json:"meshName"`
	AssemblyCode *string     `json:"assemblyCode"`
	PartID       *int64      `json:"partId"`
	Explode      *[3]float64 `json:"explode"`
	ExplodeStep  *int        `json:"explodeStep"`
}

type Asset3D struct {
	ID                    int64         `json:"id"`
	Title                 string        `json:"title"`
	URL                   string        `json:"url"`
	Licensor              string        `json:"licensor"`
	LicenseName           string        `json:"licenseName"`
	LicenseURL            *string       `json:"licenseUrl"`
	IsRealVehicleGeometry bool          `json:"isRealVehicleGeometry"`
	Bindings              []MeshBinding `json:"bindings"`
}

type VehicleDetail struct {
	Vehicle
	Facts   []Fact    `json:"facts"`
	Systems []System  `json:"systems"`
	Gaps    []DataGap `json:"dataGaps"`
	Counts  Counts    `json:"counts"`
	Model3D *Asset3D  `json:"model3d"` // nil unless a licensed, approved asset exists
}

type Counts struct {
	Assemblies    int `json:"assemblies"`
	Parts         int `json:"parts"`
	VerifiedParts int `json:"verifiedParts"`
	Fitments      int `json:"fitments"`
	ModelYears    int `json:"modelYears"`
}

const provCols = `s.id, s.title, s.source_type::text, s.url, x.source_ref, x.checked_on, x.scope_note, x.verification_status::text`

func scanProv(p *Provenance) []any {
	return []any{&p.SourceID, &p.SourceTitle, &p.SourceType, &p.SourceURL, &p.SourceRef, &p.CheckedOn, &p.ScopeNote, &p.VerificationStatus}
}

func (s *Store) ActiveVehicles(ctx context.Context) ([]Vehicle, error) {
	rows, err := s.DB.Query(ctx, `SELECT id, slug, make, model, market, summary FROM vehicles WHERE is_active ORDER BY make, model`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Vehicle, error) {
		var v Vehicle
		err := r.Scan(&v.ID, &v.Slug, &v.Make, &v.Model, &v.Market, &v.Summary)
		return v, err
	})
}

func (s *Store) vehicleBySlug(ctx context.Context, slug string) (Vehicle, error) {
	var v Vehicle
	err := s.DB.QueryRow(ctx, `SELECT id, slug, make, model, market, summary FROM vehicles WHERE slug=$1 AND is_active`, slug).
		Scan(&v.ID, &v.Slug, &v.Make, &v.Model, &v.Market, &v.Summary)
	if errors.Is(err, pgx.ErrNoRows) {
		return v, ErrNotFound
	}
	return v, err
}

func (s *Store) VehicleDetail(ctx context.Context, slug string) (*VehicleDetail, error) {
	v, err := s.vehicleBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	d := &VehicleDetail{Vehicle: v, Facts: []Fact{}, Systems: []System{}, Gaps: []DataGap{}}

	rows, err := s.DB.Query(ctx, `SELECT x.label, x.value, `+provCols+`
		FROM vehicle_facts x JOIN sources s ON s.id=x.source_id
		WHERE x.vehicle_id=$1 AND x.verification_status <> 'disputed' ORDER BY x.sort_order`, v.ID)
	if err != nil {
		return nil, err
	}
	d.Facts, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (Fact, error) {
		var f Fact
		err := r.Scan(append([]any{&f.Label, &f.Value}, scanProv(&f.Provenance)...)...)
		return f, err
	})
	if err != nil {
		return nil, err
	}

	rows, err = s.DB.Query(ctx, `SELECT vs.slug, vs.name, count(a.id)
		FROM vehicle_systems vs JOIN assemblies a ON a.system_id=vs.id AND a.vehicle_id=$1
		GROUP BY vs.id ORDER BY vs.sort_order`, v.ID)
	if err != nil {
		return nil, err
	}
	d.Systems, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (System, error) {
		var x System
		err := r.Scan(&x.Slug, &x.Name, &x.AssemblyCount)
		return x, err
	})
	if err != nil {
		return nil, err
	}

	rows, err = s.DB.Query(ctx, `SELECT area, missing, access_needed, status FROM data_gaps WHERE vehicle_id=$1 ORDER BY sort_order, id`, v.ID)
	if err != nil {
		return nil, err
	}
	d.Gaps, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (DataGap, error) {
		var g DataGap
		err := r.Scan(&g.Area, &g.Missing, &g.AccessNeeded, &g.Status)
		return g, err
	})
	if err != nil {
		return nil, err
	}

	err = s.DB.QueryRow(ctx, `SELECT
		(SELECT count(*) FROM assemblies WHERE vehicle_id=$1),
		(SELECT count(DISTINCT ap.part_id) FROM assembly_parts ap JOIN assemblies a ON a.id=ap.assembly_id WHERE a.vehicle_id=$1),
		(SELECT count(DISTINCT p.id) FROM parts p JOIN assembly_parts ap ON ap.part_id=p.id JOIN assemblies a ON a.id=ap.assembly_id
		   WHERE a.vehicle_id=$1 AND p.verification_status='verified'),
		(SELECT count(*) FROM fitments WHERE vehicle_id=$1),
		(SELECT count(*) FROM model_years WHERE vehicle_id=$1)`, v.ID).
		Scan(&d.Counts.Assemblies, &d.Counts.Parts, &d.Counts.VerifiedParts, &d.Counts.Fitments, &d.Counts.ModelYears)
	if err != nil {
		return nil, err
	}

	d.Model3D, err = s.licensedModel(ctx, v.ID)
	return d, err
}

// licensedModel returns the newest 3D asset that passes every licence gate.
func (s *Store) licensedModel(ctx context.Context, vehicleID int64) (*Asset3D, error) {
	var a Asset3D
	err := s.DB.QueryRow(ctx, `SELECT id, title, url, licensor, license_name, license_url, is_real_vehicle_geometry
		FROM media_assets
		WHERE vehicle_id=$1 AND kind='model_3d' AND license_status='licensed_verified'
		  AND commercial_use_permitted IS TRUE AND is_real_vehicle_geometry IS NOT NULL
		  AND approved_at IS NOT NULL AND mesh_node_count >= 2 AND url IS NOT NULL AND licensor IS NOT NULL AND license_name IS NOT NULL
		ORDER BY approved_at DESC LIMIT 1`, vehicleID).
		Scan(&a.ID, &a.Title, &a.URL, &a.Licensor, &a.LicenseName, &a.LicenseURL, &a.IsRealVehicleGeometry)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(ctx, `SELECT b.mesh_name, a.code, b.part_id, b.explode_x, b.explode_y, b.explode_z, b.explode_step
		FROM asset_mesh_bindings b LEFT JOIN assemblies a ON a.id=b.assembly_id
		WHERE b.asset_id=$1 ORDER BY b.mesh_name`, a.ID)
	if err != nil {
		return nil, err
	}
	a.Bindings, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (MeshBinding, error) {
		var b MeshBinding
		var x, y, z *float64
		err := r.Scan(&b.MeshName, &b.AssemblyCode, &b.PartID, &x, &y, &z, &b.ExplodeStep)
		if x != nil && y != nil && z != nil {
			b.Explode = &[3]float64{*x, *y, *z}
		}
		return b, err
	})
	return &a, err
}
