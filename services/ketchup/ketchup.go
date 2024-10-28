package main

import (
    "fmt"
    "log"
    "net/http"
    "os"

    "github.com/PuerkitoBio/goquery"
)

const baseURL = "https://www.rottentomatoes.com/m/"

// Health check endpoint
func healthCheck(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
}

// Root redirect
func rootHandler(w http.ResponseWriter, r *http.Request) {
    http.Redirect(w, r, "/empty", http.StatusFound)
}

// Rating retrieval
func ratingHandler(w http.ResponseWriter, r *http.Request) {
    id := r.URL.Path[1:] // Get the ID from the URL
    log.Printf("INF: Request for %s", id)

    if id != "empty" {
        res, err := http.Get(baseURL + id)
        if err != nil {
            errorMsg := fmt.Sprintf("ERR: got a %v for %s 😭😭😭", err, baseURL+id)
            log.Println(errorMsg)
            http.Error(w, errorMsg, http.StatusInternalServerError)
            return
        }
        defer res.Body.Close()

        doc, err := goquery.NewDocumentFromReader(res.Body)
        if err != nil {
            log.Println("ERR: failed to parse response")
            http.Error(w, "Failed to parse response", http.StatusInternalServerError)
            return
        }

        tomatoUserRatingRaw := doc.Find("span.mop-ratings-wrap__percentage").Eq(1).Text()
        if tomatoUserRatingRaw != "" {
            tomatoUserRating := tomatoUserRatingRaw[:len(tomatoUserRatingRaw)-1] // Remove '%'
            log.Printf("INF: Got it! ✌️  Rating is: %s for %s", tomatoUserRating, id)
            w.WriteHeader(http.StatusOK)
            fmt.Fprintf(w, `{"tomatoUserRating": "%s"}`, tomatoUserRating)
        } else {
            errorMsg := fmt.Sprintf("ERR: couldn't find a rating for %s - sorry 😭😭😭", id)
            log.Println(errorMsg)
            http.Error(w, errorMsg, http.StatusNotFound)
        }
    } else {
        errorMsg := "ERR: URL missing 😭"
        log.Println(errorMsg)
        http.Error(w, errorMsg, http.StatusExpectationFailed)
    }
}

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "80"
    }
    host := "0.0.0.0"
    log.Printf("🍅🍅🍅 KETCHUP - happy squeezing!\n")
    log.Printf("Server started on %s:%s\n", host, port)

    http.HandleFunc("/health", healthCheck)
    http.HandleFunc("/", rootHandler)
    http.HandleFunc("/"+id, ratingHandler)

    log.Fatal(http.ListenAndServe(host+":"+port, nil))
}
