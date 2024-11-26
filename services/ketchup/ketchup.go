package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/PuerkitoBio/goquery"
	"github.com/gorilla/mux"
)

const baseURL = "https://www.rottentomatoes.com/m/"

func main() {
	r := mux.NewRouter()

	// Logging middleware
	r.Use(loggingMiddleware)

	// Healthcheck endpoint
	r.HandleFunc("/health", healthCheckHandler).Methods("GET")

	// Redirect root to /empty
	r.HandleFunc("/", rootHandler).Methods("GET")

	// Route handler for /:id
	r.HandleFunc("/{id}", idHandler).Methods("GET")

	// Start the server
	port := getPort()
	host := "0.0.0.0"
	mode := getEnv("NODE_ENV", "default")
	release := getEnv("RELEASE", "snapshot")
	log.Printf("🍅🍅🍅 KETCHUP - happy squeezing!")
	log.Printf("%s started on %s:%s", release, host, port)
	log.Printf("mode: %s", mode)
	log.Fatal(http.ListenAndServe(fmt.Sprintf("%s:%s", host, port), r))
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s %s", r.Method, r.RequestURI, r.Proto)
		next.ServeHTTP(w, r)
	})
}

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/empty", http.StatusFound)
}

func idHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	log.Printf("INF: Request for %s", id)

	if id != "empty" {
		resp, err := http.Get(baseURL + id)
		if err != nil {
			errorMessage := fmt.Sprintf("ERR: got a %d for %s%s 😭😭😭", resp.StatusCode, baseURL, id)
			log.Println(errorMessage)
			http.Error(w, errorMessage, http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			errorMessage := fmt.Sprintf("ERR: couldn't parse the response for %s - sorry 😭😭😭", id)
			log.Println(errorMessage)
			http.Error(w, errorMessage, http.StatusInternalServerError)
			return
		}

		tomatoUserRatingRaw := doc.Find("span.mop-ratings-wrap__percentage").Eq(1).Text()
		if tomatoUserRatingRaw != "" {
			tomatoUserRating := tomatoUserRatingRaw[:len(tomatoUserRatingRaw)-1]
			tomatoUserRating = trimSpaces(tomatoUserRating)
			log.Printf("INF: Got it! ✌️  Rating is: %s for %s", tomatoUserRating, id)
			w.WriteHeader(http.StatusOK)
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"tomatoUserRating": "%s"}`, tomatoUserRating)
		} else {
			errorMessage := fmt.Sprintf("ERR: couldn't find a rating for %s - sorry 😭😭😭", id)
			log.Println(errorMessage)
			http.Error(w, errorMessage, http.StatusInternalServerError)
		}
	} else {
		errorMessage := "ERR: URL missing 😭"
		log.Println(errorMessage)
		http.Error(w, errorMessage, http.StatusExpectationFailed)
	}
}

func getPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	return port
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func trimSpaces(s string) string {
	return strings.TrimSpace(s)
}
