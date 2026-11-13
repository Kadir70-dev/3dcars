package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Kadir70-dev/3dcars/api/internal/resources"
	"github.com/Kadir70-dev/3dcars/api/internal/store"
)

const cookieName = "atlas_admin"

type ctxKey struct{}

func (s *Server) setCookie(w http.ResponseWriter, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: value, Path: "/", MaxAge: maxAge,
		HttpOnly: true, Secure: s.Cfg.SecureCookies, SameSite: http.SameSiteStrictMode,
	})
}

func (s *Server) admin(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(cookieName)
		if err != nil || c.Value == "" {
			writeErr(w, http.StatusUnauthorized, "sign in required")
			return
		}
		u, err := s.Store.SessionUser(r.Context(), c.Value)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeErr(w, http.StatusUnauthorized, "session expired")
				return
			}
			fail(w, err)
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, u)))
	}
}

func user(r *http.Request) *store.Admin { return r.Context().Value(ctxKey{}).(*store.Admin) }

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	token, err := s.Store.Login(r.Context(), in.Email, in.Password)
	if errors.Is(err, store.ErrBadCredentials) {
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	s.setCookie(w, token, int(store.SessionTTL.Seconds()))
	writeJSON(w, http.StatusOK, map[string]string{"status": "signed in"})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(cookieName); err == nil {
		_ = s.Store.Logout(r.Context(), c.Value)
	}
	s.setCookie(w, "", -1)
	writeJSON(w, http.StatusOK, map[string]string{"status": "signed out"})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusOK, user(r)) }

func (s *Server) listResources(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"resources": resources.All})
}

func (s *Server) options(w http.ResponseWriter, r *http.Request) {
	o, err := s.Store.Options(r.Context(), r.PathValue("resource"))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"options": o})
}

func resourceFrom(w http.ResponseWriter, r *http.Request) (resources.Resource, bool) {
	res, ok := resources.Get(r.PathValue("resource"))
	if !ok {
		writeErr(w, http.StatusNotFound, "unknown resource")
	}
	return res, ok
}

func (s *Server) listRows(w http.ResponseWriter, r *http.Request) {
	res, ok := resourceFrom(w, r)
	if !ok {
		return
	}
	rows, err := s.Store.List(r.Context(), res)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rows": rows})
}

func (s *Server) saveRow(w http.ResponseWriter, r *http.Request) {
	res, ok := resourceFrom(w, r)
	if !ok {
		return
	}
	var id int64
	if r.Method == http.MethodPut {
		if id, ok = pathID(r); !ok {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
	} else if res.NoCreate {
		writeErr(w, http.StatusMethodNotAllowed, "records of this type cannot be created here")
		return
	}
	var in map[string]any
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	v, err := res.Normalize(in)
	if err != nil {
		fail(w, err)
		return
	}
	id, err = s.Store.Save(r.Context(), user(r).ID, res, id, v)
	if err != nil {
		fail(w, err)
		return
	}
	status := http.StatusOK
	if r.Method == http.MethodPost {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{"id": id})
}

func (s *Server) deleteRow(w http.ResponseWriter, r *http.Request) {
	res, ok := resourceFrom(w, r)
	if !ok {
		return
	}
	if res.NoDelete {
		writeErr(w, http.StatusMethodNotAllowed, "records of this type cannot be deleted")
		return
	}
	id, ok := pathID(r)
	if !ok {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err := s.Store.Delete(r.Context(), user(r).ID, res, id); err != nil {
		fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
