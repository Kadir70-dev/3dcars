package store

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
)

type Assembly struct {
	Code       string     `json:"code"`
	Name       string     `json:"name"`
	Summary    *string    `json:"summary"`
	SystemSlug *string    `json:"systemSlug"`
	SystemName *string    `json:"systemName"`
	PartCount  int        `json:"partCount"`
	Provenance Provenance `json:"provenance"`
}

type PartSummary struct {
	ID            int64      `json:"id"`
	OEMPartNumber *string    `json:"oemPartNumber"`
	Name          string     `json:"name"`
	Quantity      *int       `json:"quantity,omitempty"`
	DiagramRef    *string    `json:"diagramRef,omitempty"`
	AssemblyCode  *string    `json:"assemblyCode,omitempty"`
	AssemblyName  *string    `json:"assemblyName,omitempty"`
	ListingURL    *string    `json:"listingUrl"`
	ImageURL      *string    `json:"imageUrl"`
	Provenance    Provenance `json:"provenance"`
}

type Spec struct {
	Key        string     `json:"key"`
	Value      string     `json:"value"`
	Unit       *string    `json:"unit"`
	Provenance Provenance `json:"provenance"`
}

type Fitment struct {
	VehicleSlug string     `json:"vehicleSlug"`
	ModelYear   *int       `json:"modelYear"`
	Market      *string    `json:"market"`
	VINFrom     *string    `json:"vinFrom"`
	VINTo       *string    `json:"vinTo"`
	Notes       *string    `json:"notes"`
	Provenance  Provenance `json:"provenance"`
}

type PartDetail struct {
	PartSummary
	Description *string       `json:"description"`
	Revision    *string       `json:"revision"`
	Assemblies  []PartSummary `json:"assemblies"` // assembly memberships (quantity/diagramRef per link)
	Specs       []Spec        `json:"specs"`
	Fitments    []Fitment     `json:"fitments"`
}

type AssemblyDetail struct {
	Assembly
	Parts []PartSummary `json:"parts"`
}

type Filter struct {
	Query    string
	System   string
	Assembly string
}

func like(q string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(strings.ToLower(strings.TrimSpace(q))) + "%"
}

const assemblySelect = `SELECT a.code, a.name, a.summary, vs.slug, vs.name,
	(SELECT count(*) FROM assembly_parts ap WHERE ap.assembly_id=a.id), ` + provCols + `
	FROM assemblies a JOIN assemblies x ON x.id=a.id JOIN sources s ON s.id=a.source_id
	LEFT JOIN vehicle_systems vs ON vs.id=a.system_id`

func scanAssembly(r pgx.CollectableRow) (Assembly, error) {
	var a Assembly
	err := r.Scan(append([]any{&a.Code, &a.Name, &a.Summary, &a.SystemSlug, &a.SystemName, &a.PartCount}, scanProv(&a.Provenance)...)...)
	return a, err
}

// Assemblies lists assemblies for a vehicle filtered by text, system and assembly code.
func (s *Store) Assemblies(ctx context.Context, slug string, f Filter) ([]Assembly, error) {
	v, err := s.vehicleBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(ctx, assemblySelect+`
		WHERE a.vehicle_id=$1
		  AND ($2='' OR lower(a.name) LIKE $3 OR a.code LIKE $3)
		  AND ($4='' OR vs.slug=$4)
		  AND ($5='' OR a.code=$5)
		ORDER BY a.code`, v.ID, strings.TrimSpace(f.Query), like(f.Query), f.System, f.Assembly)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanAssembly)
}

const partSelect = `SELECT p.id, p.oem_part_number, p.name, ap.quantity, ap.diagram_ref, a.code, a.name, p.listing_url, p.image_url, ` + provCols + `
	FROM parts p JOIN parts x ON x.id=p.id JOIN sources s ON s.id=p.source_id`

func scanPart(r pgx.CollectableRow) (PartSummary, error) {
	var p PartSummary
	err := r.Scan(append([]any{&p.ID, &p.OEMPartNumber, &p.Name, &p.Quantity, &p.DiagramRef, &p.AssemblyCode, &p.AssemblyName, &p.ListingURL, &p.ImageURL}, scanProv(&p.Provenance)...)...)
	return p, err
}

// Parts searches individual parts linked to a vehicle's assemblies or listed
// with a fitment for the vehicle (e.g. client catalogue items not yet mapped to an assembly).
func (s *Store) Parts(ctx context.Context, slug string, f Filter) ([]PartSummary, error) {
	v, err := s.vehicleBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(ctx, partSelect+`
		LEFT JOIN assembly_parts ap ON ap.part_id=p.id
		  AND ap.assembly_id IN (SELECT id FROM assemblies WHERE vehicle_id=$1)
		LEFT JOIN assemblies a ON a.id=ap.assembly_id
		LEFT JOIN vehicle_systems vs ON vs.id=a.system_id
		WHERE (a.id IS NOT NULL OR EXISTS (SELECT 1 FROM fitments f WHERE f.part_id=p.id AND f.vehicle_id=$1))
		  AND ($2='' OR lower(p.name) LIKE $3 OR lower(coalesce(p.oem_part_number,'')) LIKE $3)
		  AND ($4='' OR vs.slug=$4)
		  AND ($5='' OR a.code=$5)
		ORDER BY a.code NULLS LAST, p.name LIMIT 200`, v.ID, strings.TrimSpace(f.Query), like(f.Query), f.System, f.Assembly)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanPart)
}

func (s *Store) AssemblyDetail(ctx context.Context, slug, code string) (*AssemblyDetail, error) {
	list, err := s.Assemblies(ctx, slug, Filter{Assembly: code})
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, ErrNotFound
	}
	d := &AssemblyDetail{Assembly: list[0]}
	d.Parts, err = s.Parts(ctx, slug, Filter{Assembly: code})
	return d, err
}

func (s *Store) PartDetail(ctx context.Context, id int64) (*PartDetail, error) {
	var d PartDetail
	err := s.DB.QueryRow(ctx, `SELECT p.id, p.oem_part_number, p.name, p.description, p.revision, p.listing_url, p.image_url, `+provCols+`
		FROM parts p JOIN parts x ON x.id=p.id JOIN sources s ON s.id=p.source_id WHERE p.id=$1`, id).
		Scan(append([]any{&d.ID, &d.OEMPartNumber, &d.Name, &d.Description, &d.Revision, &d.ListingURL, &d.ImageURL}, scanProv(&d.Provenance)...)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	rows, err := s.DB.Query(ctx, `SELECT p.id, p.oem_part_number, p.name, x.quantity, x.diagram_ref, a.code, a.name, p.listing_url, p.image_url,
		s.id, s.title, s.source_type::text, s.url, x.source_ref, x.checked_on, NULL::text, x.verification_status::text
		FROM assembly_parts x JOIN parts p ON p.id=x.part_id JOIN assemblies a ON a.id=x.assembly_id
		JOIN vehicles v ON v.id=a.vehicle_id AND v.is_active
		JOIN sources s ON s.id=x.source_id
		WHERE x.part_id=$1 ORDER BY a.code`, id)
	if err != nil {
		return nil, err
	}
	if d.Assemblies, err = pgx.CollectRows(rows, scanPart); err != nil {
		return nil, err
	}
	rows, err = s.DB.Query(ctx, `SELECT x.spec_key, x.spec_value, x.unit, `+provCols+`
		FROM part_specs x JOIN sources s ON s.id=x.source_id WHERE x.part_id=$1 ORDER BY x.spec_key`, id)
	if err != nil {
		return nil, err
	}
	d.Specs, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (Spec, error) {
		var sp Spec
		err := r.Scan(append([]any{&sp.Key, &sp.Value, &sp.Unit}, scanProv(&sp.Provenance)...)...)
		return sp, err
	})
	if err != nil {
		return nil, err
	}
	rows, err = s.DB.Query(ctx, `SELECT v.slug, my.year, x.market, x.vin_from, x.vin_to, x.notes, `+
		`s.id, s.title, s.source_type::text, s.url, x.source_ref, x.checked_on, NULL::text, x.verification_status::text
		FROM fitments x JOIN vehicles v ON v.id=x.vehicle_id LEFT JOIN model_years my ON my.id=x.model_year_id
		JOIN sources s ON s.id=x.source_id WHERE x.part_id=$1 ORDER BY v.slug, my.year`, id)
	if err != nil {
		return nil, err
	}
	d.Fitments, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (Fitment, error) {
		var f Fitment
		err := r.Scan(append([]any{&f.VehicleSlug, &f.ModelYear, &f.Market, &f.VINFrom, &f.VINTo, &f.Notes}, scanProv(&f.Provenance)...)...)
		return f, err
	})
	return &d, err
}

type Source struct {
	ID                 int64   `json:"id"`
	Title              string  `json:"title"`
	Publisher          string  `json:"publisher"`
	SourceType         string  `json:"sourceType"`
	URL                *string `json:"url"`
	LicenseNotes       *string `json:"licenseNotes"`
	AccessRequirements *string `json:"accessRequirements"`
}

func (s *Store) Sources(ctx context.Context) ([]Source, error) {
	rows, err := s.DB.Query(ctx, `SELECT id, title, publisher, source_type::text, url, license_notes, access_requirements FROM sources ORDER BY id`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Source, error) {
		var x Source
		err := r.Scan(&x.ID, &x.Title, &x.Publisher, &x.SourceType, &x.URL, &x.LicenseNotes, &x.AccessRequirements)
		return x, err
	})
}

type QuoteItem struct {
	Kind  string `json:"kind"` // "assembly" | "part"
	Ref   string `json:"ref"`  // assembly code or part id
	Label string `json:"label"`
}

type QuoteRequest struct {
	Name    string      `json:"name"`
	Email   string      `json:"email"`
	VIN     *string     `json:"vin"`
	Message *string     `json:"message"`
	Items   []QuoteItem `json:"items"`
}

func (s *Store) CreateQuote(ctx context.Context, q QuoteRequest) (int64, error) {
	items, err := json.Marshal(q.Items)
	if err != nil {
		return 0, err
	}
	var id int64
	err = s.DB.QueryRow(ctx, `INSERT INTO quote_requests (name, email, vin, message, items) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		q.Name, q.Email, q.VIN, q.Message, items).Scan(&id)
	return id, err
}
