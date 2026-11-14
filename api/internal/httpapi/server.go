// Package httpapi exposes the catalog over JSON HTTP.
package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Kadir70-dev/3dcars/api/internal/resources"
	"github.com/Kadir70-dev/3dcars/api/internal/store"
)

type Config struct {
	AllowedOrigins []string // for state-changing requests; empty = same-origin only via proxy
	SecureCookies  bool
}

type Server struct {
	Store   *store.Store
	Cfg     Config
	limiter *rateLimiter
}

func New(s *store.Store, cfg Config) *Server {
	return &Server{Store: s, Cfg: cfg, limiter: newRateLimiter(10, time.Minute)}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/v1/vehicles", s.listVehicles)
	mux.HandleFunc("GET /api/v1/vehicles/{slug}", s.getVehicle)
	mux.HandleFunc("GET /api/v1/vehicles/{slug}/assemblies", s.listAssemblies)
	mux.HandleFunc("GET /api/v1/vehicles/{slug}/assemblies/{code}", s.getAssembly)
	mux.HandleFunc("GET /api/v1/vehicles/{slug}/search", s.search)
	mux.HandleFunc("GET /api/v1/parts/{id}", s.getPart)
	mux.HandleFunc("GET /api/v1/store-parts", s.storeParts)
	mux.HandleFunc("GET /api/v1/sources", s.listSources)
	mux.HandleFunc("POST /api/v1/quotes", s.limited(s.createQuote))

	mux.HandleFunc("POST /api/v1/admin/login", s.limited(s.login))
	mux.HandleFunc("POST /api/v1/admin/logout", s.logout)
	mux.HandleFunc("GET /api/v1/admin/me", s.admin(s.me))
	mux.HandleFunc("GET /api/v1/admin/resources", s.admin(s.listResources))
	mux.HandleFunc("GET /api/v1/admin/options/{resource}", s.admin(s.options))
	mux.HandleFunc("GET /api/v1/admin/r/{resource}", s.admin(s.listRows))
	mux.HandleFunc("POST /api/v1/admin/r/{resource}", s.admin(s.saveRow))
	mux.HandleFunc("PUT /api/v1/admin/r/{resource}/{id}", s.admin(s.saveRow))
	mux.HandleFunc("DELETE /api/v1/admin/r/{resource}/{id}", s.admin(s.deleteRow))
	return s.middleware(mux)
}

func (s *Server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Cache-Control", "no-store")
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if !s.originOK(r) {
				writeErr(w, http.StatusForbidden, "cross-origin request rejected")
				return
			}
			if r.Method != http.MethodDelete && !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") &&
				r.URL.Path != "/api/v1/admin/logout" {
				writeErr(w, http.StatusUnsupportedMediaType, "expected application/json")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
		}
		next.ServeHTTP(w, r)
		slog.Info("http", "method", r.Method, "path", r.URL.Path, "dur", time.Since(start))
	})
}

// originOK rejects browser requests from origins we do not serve. Requests
// without an Origin header (server-to-server, curl) are allowed; admin routes
// still require the SameSite=Strict session cookie.
func (s *Server) originOK(r *http.Request) bool {
	o := r.Header.Get("Origin")
	if o == "" {
		return true
	}
	for _, a := range s.Cfg.AllowedOrigins {
		if o == a {
			return true
		}
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// fail maps store errors to HTTP responses without leaking internals.
func fail(w http.ResponseWriter, err error) {
	var ve resources.ValidationError
	switch {
	case errors.As(err, &ve):
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation failed", "fields": ve})
	case errors.Is(err, store.ErrNotFound):
		writeErr(w, http.StatusNotFound, "not found")
	case errors.Is(err, store.ErrConflict):
		writeErr(w, http.StatusConflict, err.Error())
	default:
		slog.Error("request failed", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal error")
	}
}

func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}

type rateLimiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string][]time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{limit: limit, window: window, hits: map[string][]time.Time{}}
}

func (l *rateLimiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	kept := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if now.Sub(t) < l.window {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.limit {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	return true
}

func (s *Server) limited(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		if !s.limiter.allow(r.URL.Path + "|" + ip) {
			writeErr(w, http.StatusTooManyRequests, "too many requests, try again shortly")
			return
		}
		h(w, r)
	}
}
