// Command atlas-api serves the catalog API and runs maintenance tasks.
//
//	atlas-api serve            start the HTTP server
//	atlas-api migrate          apply db/migrations and db/seed
//	atlas-api create-admin     create/reset an admin (ADMIN_EMAIL, ADMIN_PASSWORD env)
//	atlas-api glb-meshes FILE  list the named mesh nodes of a .glb/.gltf (no database)
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/Kadir70-dev/3dcars/api/internal/dbx"
	"github.com/Kadir70-dev/3dcars/api/internal/glb"
	"github.com/Kadir70-dev/3dcars/api/internal/httpapi"
	"github.com/Kadir70-dev/3dcars/api/internal/store"
)

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// glbMeshes prints a mesh inventory plus draft bindings. Drafts carry no
// assembly, part or offsets: those must come from the asset's metadata or an
// authorized parts source and are entered in the admin.
func glbMeshes(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	inv, err := glb.Read(f)
	if err != nil {
		return err
	}
	drafts := make([]map[string]any, 0, len(inv.MeshNodes))
	for _, m := range inv.MeshNodes {
		drafts = append(drafts, map[string]any{"mesh_name": m.Name, "assembly_id": nil, "part_id": nil,
			"explode_x": nil, "explode_y": nil, "explode_z": nil, "explode_step": nil})
	}
	out := json.NewEncoder(os.Stdout)
	out.SetIndent("", "  ")
	if err := out.Encode(map[string]any{"inventory": inv, "selectable": inv.Selectable(), "draftBindings": drafts}); err != nil {
		return err
	}
	if !inv.Selectable() {
		return errors.New("file lacks separately named meshes: it cannot drive the parts explorer")
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run() error {
	cmd := "serve"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}
	if cmd == "glb-meshes" {
		if len(os.Args) != 3 {
			return errors.New("usage: atlas-api glb-meshes FILE.glb")
		}
		return glbMeshes(os.Args[2])
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return errors.New("DATABASE_URL is required")
	}
	pool, err := dbx.Connect(ctx, dbURL)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer pool.Close()
	st := &store.Store{DB: pool}

	switch cmd {
	case "migrate":
		root := env("DB_DIR", filepath.Join("..", "db"))
		for _, sub := range []string{"migrations", "seed"} {
			applied, err := dbx.ApplyDir(ctx, pool, filepath.Join(root, sub), sub)
			if err != nil {
				return err
			}
			fmt.Printf("%s: applied %d file(s) %v\n", sub, len(applied), applied)
		}
		return nil
	case "create-admin":
		if err := st.CreateAdmin(ctx, os.Getenv("ADMIN_EMAIL"), os.Getenv("ADMIN_PASSWORD")); err != nil {
			return err
		}
		fmt.Println("admin user saved")
		return nil
	case "serve":
		var origins []string
		for _, o := range strings.Split(env("ALLOWED_ORIGINS", "http://localhost:3020"), ",") {
			if o = strings.TrimSpace(o); o != "" {
				origins = append(origins, o)
			}
		}
		srv := &http.Server{
			Addr:              env("ADDR", "127.0.0.1:8088"),
			Handler:           httpapi.New(st, httpapi.Config{AllowedOrigins: origins, SecureCookies: env("SECURE_COOKIES", "false") == "true"}).Handler(),
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       15 * time.Second,
			WriteTimeout:      30 * time.Second,
		}
		go func() {
			<-ctx.Done()
			shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_ = srv.Shutdown(shutdown)
		}()
		slog.Info("listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
	return fmt.Errorf("unknown command %q", cmd)
}
