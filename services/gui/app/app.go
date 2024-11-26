package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/gorilla/pat"
	"github.com/gorilla/sessions"
	_ "github.com/lib/pq"
)

var (
	db          *sql.DB
	store       *sessions.CookieStore
	sessionName = "moveez-session"
)

func main() {
	// Database connection
	var err error
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASS")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	dbConnectionString := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPassword, dbHost, dbPort, dbName)

	db, err = sql.Open("postgres", dbConnectionString)
	if err != nil {
		log.Fatalf("Error opening database: %q", err)
	}
	defer db.Close()

	// Session store
	sessionSecret := os.Getenv("SESSION_SECRET")
	store = sessions.NewCookieStore([]byte(sessionSecret))

	// Router
	r := mux.NewRouter()

	// Routes
	r.HandleFunc("/", landingPageHandler).Methods("GET")
	r.HandleFunc("/health", healthHandler).Methods("GET")
	r.HandleFunc("/impressum", impressumHandler).Methods("GET")
	r.HandleFunc("/title", ensureLoggedIn(getTitlesHandler)).Methods("GET")
	r.HandleFunc("/title", ensureLoggedIn(postTitleHandler)).Methods("POST")
	r.HandleFunc("/title/{id}", ensureLoggedIn(getTitleHandler)).Methods("GET")
	r.HandleFunc("/title/{id}", ensureLoggedIn(updateTitleHandler)).Methods("PUT")
	r.HandleFunc("/title/{id}", ensureLoggedIn(deleteTitleHandler)).Methods("DELETE")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	log.Printf("Starting server on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func ensureLoggedIn(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, _ := store.Get(r, sessionName)
		if session.Values["user"] == nil {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}
		next.ServeHTTP(w, r)
	}
}

func landingPageHandler(w http.ResponseWriter, r *http.Request) {
	// Implement landing page handler
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func impressumHandler(w http.ResponseWriter, r *http.Request) {
	// Implement impressum handler
}

func getTitlesHandler(w http.ResponseWriter, r *http.Request) {
	// Implement get titles handler
}

func postTitleHandler(w http.ResponseWriter, r *http.Request) {
	// Implement post title handler
}

func getTitleHandler(w http.ResponseWriter, r *http.Request) {
	// Implement get title handler
}

func updateTitleHandler(w http.ResponseWriter, r *http.Request) {
	// Implement update title handler
}

func deleteTitleHandler(w http.ResponseWriter, r *http.Request) {
	// Implement delete title handler
}
