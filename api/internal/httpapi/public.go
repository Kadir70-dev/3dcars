package httpapi

import (
	"encoding/json"
	"net/http"
	"net/mail"
	"regexp"
	"strings"

	"github.com/Kadir70-dev/3dcars/api/internal/store"
)

func filterFrom(r *http.Request) store.Filter {
	q := r.URL.Query()
	trim := func(k string, max int) string {
		v := strings.TrimSpace(q.Get(k))
		if len(v) > max {
			v = v[:max]
		}
		return v
	}
	return store.Filter{Query: trim("q", 100), System: trim("system", 60), Assembly: trim("assembly", 20)}
}

func (s *Server) listVehicles(w http.ResponseWriter, r *http.Request) {
	v, err := s.Store.ActiveVehicles(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vehicles": v})
}

func (s *Server) getVehicle(w http.ResponseWriter, r *http.Request) {
	d, err := s.Store.VehicleDetail(r.Context(), r.PathValue("slug"))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (s *Server) listAssemblies(w http.ResponseWriter, r *http.Request) {
	a, err := s.Store.Assemblies(r.Context(), r.PathValue("slug"), filterFrom(r))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"assemblies": a})
}

func (s *Server) getAssembly(w http.ResponseWriter, r *http.Request) {
	a, err := s.Store.AssemblyDetail(r.Context(), r.PathValue("slug"), r.PathValue("code"))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// search returns matching assemblies and individual parts in one response.
func (s *Server) search(w http.ResponseWriter, r *http.Request) {
	f := filterFrom(r)
	a, err := s.Store.Assemblies(r.Context(), r.PathValue("slug"), f)
	if err != nil {
		fail(w, err)
		return
	}
	p, err := s.Store.Parts(r.Context(), r.PathValue("slug"), f)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"assemblies": a, "parts": p})
}

func (s *Server) getPart(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	p, err := s.Store.PartDetail(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) listSources(w http.ResponseWriter, r *http.Request) {
	src, err := s.Store.Sources(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sources": src})
}

var vinRe = regexp.MustCompile(`^[A-HJ-NPR-Z0-9]{17}$`)

// ValidateQuote normalises and checks a public quote request.
func ValidateQuote(q *store.QuoteRequest) map[string]string {
	errs := map[string]string{}
	q.Name = strings.TrimSpace(q.Name)
	q.Email = strings.TrimSpace(q.Email)
	if q.Name == "" || len(q.Name) > 120 {
		errs["name"] = "enter your name (max 120 characters)"
	}
	if a, err := mail.ParseAddress(q.Email); err != nil || a.Address != q.Email || len(q.Email) > 200 {
		errs["email"] = "enter a valid email address"
	}
	if q.VIN != nil {
		v := strings.ToUpper(strings.TrimSpace(*q.VIN))
		if v == "" {
			q.VIN = nil
		} else if !vinRe.MatchString(v) {
			errs["vin"] = "a VIN has 17 characters (letters except I, O, Q, and digits)"
		} else {
			q.VIN = &v
		}
	}
	if q.Message != nil {
		m := strings.TrimSpace(*q.Message)
		if len(m) > 2000 {
			errs["message"] = "message is too long (max 2000 characters)"
		}
		q.Message = &m
	}
	if len(q.Items) == 0 || len(q.Items) > 50 {
		errs["items"] = "add between 1 and 50 items"
	}
	for i := range q.Items {
		it := &q.Items[i]
		it.Ref, it.Label = strings.TrimSpace(it.Ref), strings.TrimSpace(it.Label)
		if (it.Kind != "assembly" && it.Kind != "part") || it.Ref == "" || len(it.Ref) > 40 || len(it.Label) > 200 {
			errs["items"] = "invalid item"
		}
	}
	return errs
}

func (s *Server) createQuote(w http.ResponseWriter, r *http.Request) {
	var q store.QuoteRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&q); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if errs := ValidateQuote(&q); len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation failed", "fields": errs})
		return
	}
	id, err := s.Store.CreateQuote(r.Context(), q)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":     id,
		"status": "received",
		"note":   "Request stored for manual review. No price, availability or order has been confirmed, and no automatic email is sent.",
	})
}
