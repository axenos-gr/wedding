package main

import (
	"crypto/rand"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/argon2"
)

type Config struct {
	DBDSN     string
	JWTSecret []byte
	Port      string
}

var (
	db     *sql.DB
	config Config
)

type Claims struct {
	UserID  int  `json:"userId"`
	IsAdmin bool `json:"isAdmin"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type LoginResponse struct {
	UserID  int  `json:"userId"`
	IsAdmin bool `json:"isAdmin"`
}

type EventUpdate struct {
	Name string    `json:"name"`
	Date time.Time `json:"date"`
}

func main() {
	godotenv.Load()
	loadEnv()

	var err error
	db, err = sql.Open("postgres", config.DBDSN)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Database unreachable: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/logout", logoutHandler)
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/login/validate", validateHandler)
	mux.HandleFunc("/user/change-password", changePasswordHandler)
	mux.HandleFunc("/events", getEventsHandler)
	mux.HandleFunc("/change-events", updateEventsHandler)

	handlerWithCORS := corsMiddleware(mux)

	fmt.Printf("Server smoothly running on %s\n", config.Port)
	if err := http.ListenAndServe(config.Port, handlerWithCORS); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message":"Logged out successfully"}`))
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	var userID int
	var hashedPassword string
	var isAdmin bool

	err := db.QueryRow("SELECT id, hash, is_admin FROM users WHERE name = $1", req.Name).
		Scan(&userID, &hashedPassword, &isAdmin)

	if err == sql.ErrNoRows {
		http.Error(w, "Unauthorized: Invalid credentials", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	match, err := verifyPassword(req.Password, hashedPassword)
	if err != nil || !match {
		http.Error(w, "Unauthorized: Invalid credentials", http.StatusUnauthorized)
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:  userID,
		IsAdmin: isAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(config.JWTSecret)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    tokenString,
		Expires:  expirationTime,
		HttpOnly: true,
		Secure:   true,
		Path:     "/",
		SameSite: http.SameSiteNoneMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{UserID: userID, IsAdmin: isAdmin})
}

func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	var memory uint32 = 65536
	var iterations uint32 = 3
	var parallelism uint8 = 4
	var keyLength uint32 = 32

	hash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, keyLength)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, memory, iterations, parallelism, b64Salt, b64Hash)

	return encoded, nil
}

func verifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, errors.New("invalid hash format")
	}

	if parts[1] != "argon2id" {
		return false, errors.New("incompatible argon2 variant")
	}

	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil && version != argon2.Version {
		return false, errors.New("incompatible argon2 version")
	}

	var memory uint32
	var iterations uint32
	var parallelism uint8
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism)
	if err != nil {
		return false, errors.New("invalid argon2 parameters")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, errors.New("failed to decode salt")
	}

	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, errors.New("failed to decode hash profile")
	}

	hashedInput := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(expectedHash)))

	if subtle.ConstantTimeCompare(hashedInput, expectedHash) == 1 {
		return true, nil
	}

	return false, nil
}

func validateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("token")
	if err != nil {
		if err == http.ErrNoCookie {
			http.Error(w, "Unauthorized: Missing token", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(cookie.Value, claims, func(t *jwt.Token) (any, error) {
		return config.JWTSecret, nil
	})

	if err != nil || !token.Valid {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(claims)
}

func changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(cookie.Value, claims, func(t *jwt.Token) (any, error) {
		return config.JWTSecret, nil
	})
	if err != nil || !token.Valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if req.NewPassword == "" {
		http.Error(w, "New password cannot be empty", http.StatusBadRequest)
		return
	}

	var encodedHash string
	err = db.QueryRow("SELECT hash FROM users WHERE id = $1", claims.UserID).Scan(&encodedHash)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	match, err := verifyPassword(req.OldPassword, encodedHash)
	if err != nil || !match {
		http.Error(w, "Incorrect old password", http.StatusUnauthorized)
		return
	}

	newEncodedHash, err := hashPassword(req.NewPassword)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("UPDATE users SET hash = $1 WHERE id = $2", newEncodedHash, claims.UserID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Password updated successfully"}`))
}

func getEventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Query("SELECT name, date FROM events WHERE name IN ('wedding', 'photo_unlock')")
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	eventsMap := map[string]time.Time{}
	for rows.Next() {
		var name string
		var date time.Time
		if err := rows.Scan(&name, &date); err == nil {
			eventsMap[name] = date
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(eventsMap)
}

func updateEventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(cookie.Value, claims, func(t *jwt.Token) (any, error) {
		return config.JWTSecret, nil
	})
	if err != nil || !token.Valid || !claims.IsAdmin {
		http.Error(w, "Unauthorized access", http.StatusUnauthorized)
		return
	}

	var updates []EventUpdate
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	query := `
		INSERT INTO events (name, date) VALUES ($1, $2)
		ON CONFLICT (name) DO UPDATE SET date = EXCLUDED.date;
	`

	for _, up := range updates {
		if up.Name != "wedding" && up.Name != "photo_unlock" {
			continue
		}
		if _, err := tx.Exec(query, up.Name, up.Date); err != nil {
			http.Error(w, "Database persistence transaction failure", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Event dates updated successfully"}`))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin == "http://localhost:5173" || origin == "https://axerium.org" || origin == "https://www.axerium.org" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func loadEnv() {
	getEnv := func(key, fallback string) string {
		if val, ok := os.LookupEnv(key); ok {
			return val
		}
		return fallback
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "wedding"),
	)

	config = Config{
		DBDSN:     dsn,
		JWTSecret: []byte(getEnv("JWT_SECRET", "YMi6FwjDHa/xgKyno4nKqQwn4DPT2iorIFUwc416WLbI")),
		Port:      getEnv("SERVER_PORT", ":8080"),
	}
}
