package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

var ErrBadCredentials = errors.New("invalid email or password")

const SessionTTL = 12 * time.Hour

// dummyHash keeps login timing similar for unknown emails.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("timing-equaliser"), bcrypt.DefaultCost)

func hashToken(token string) []byte {
	h := sha256.Sum256([]byte(token))
	return h[:]
}

// CreateAdmin creates or replaces an admin user's password.
func (s *Store) CreateAdmin(ctx context.Context, email, password string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if !strings.Contains(email, "@") || len(password) < 12 {
		return errors.New("need a valid email and a password of at least 12 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return err
	}
	_, err = s.DB.Exec(ctx, `INSERT INTO admin_users (email, password_hash) VALUES ($1,$2)
		ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash`, email, string(hash))
	return err
}

// Login verifies credentials and returns a new opaque session token.
func (s *Store) Login(ctx context.Context, email, password string) (string, error) {
	var id int64
	var hash string
	err := s.DB.QueryRow(ctx, `SELECT id, password_hash FROM admin_users WHERE email=$1`,
		strings.ToLower(strings.TrimSpace(email))).Scan(&id, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return "", ErrBadCredentials
	}
	if err != nil {
		return "", err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return "", ErrBadCredentials
	}
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(buf)
	_, err = s.DB.Exec(ctx, `INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES ($1,$2,$3)`,
		hashToken(token), id, time.Now().Add(SessionTTL))
	if err != nil {
		return "", err
	}
	_, _ = s.DB.Exec(ctx, `DELETE FROM admin_sessions WHERE expires_at < now()`)
	return token, nil
}

type Admin struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
}

func (s *Store) SessionUser(ctx context.Context, token string) (*Admin, error) {
	var a Admin
	err := s.DB.QueryRow(ctx, `SELECT u.id, u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id
		WHERE s.token_hash=$1 AND s.expires_at > now()`, hashToken(token)).Scan(&a.ID, &a.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &a, err
}

func (s *Store) Logout(ctx context.Context, token string) error {
	_, err := s.DB.Exec(ctx, `DELETE FROM admin_sessions WHERE token_hash=$1`, hashToken(token))
	return err
}
