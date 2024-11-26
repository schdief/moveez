package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/sirupsen/logrus"
	"gopkg.in/mgo.v2/bson"
)

var (
	db     *sql.DB
	store  *sessions.CookieStore
	logger = logrus.New()
)

type Title struct {
	ID              bson.ObjectId `bson:"_id,omitempty"`
	Name            string        `json:"name"`
	CreatedAt       time.Time     `json:"createdAt"`
	Seen            bool          `json:"seen"`
	SeenOn          time.Time     `json:"seenOn"`
	Poster          string        `json:"poster"`
	ImdbRating      float64       `json:"imdbRating"`
	ImdbID          string        `json:"imdbID"`
	Year            string        `json:"year"`
	TomatoUserRating float64      `json:"tomatoUserRating"`
	TomatoURL       string        `json:"tomatoURL"`
	User            string        `json:"user"`
	Genres          []string      `json:"genres"`
}

func postTitle(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session-name")
	userID := session.Values["user_id"].(string)

	var newTitle Title
	err := json.NewDecoder(r.Body).Decode(&newTitle)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newTitle.User = userID
	newTitle.CreatedAt = time.Now()

	if newTitle.ImdbRating == 0 {
		newTitle.ImdbRating = -1
	}

	if newTitle.TomatoURL != "" {
		path := newTitle.TomatoURL[strings.Index(newTitle.TomatoURL, "m/")+2:]
		resp, err := http.Get("http://" + os.Getenv("KETCHUP_ENDPOINT") + "/" + path)
		if err != nil {
			logger.Warnf("KETCHUP failed: %v", err)
			newTitle.TomatoUserRating = -1
		} else {
			defer resp.Body.Close()
			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)
			newTitle.TomatoUserRating = result["tomatoUserRating"].(float64)
		}
	}

	query := `INSERT INTO titles (name, createdAt, seen, seenOn, poster, imdbRating, imdbID, year, tomatoUserRating, tomatoURL, user, genres) 
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = db.Exec(query, newTitle.Name, newTitle.CreatedAt, newTitle.Seen, newTitle.SeenOn, newTitle.Poster, newTitle.ImdbRating, newTitle.ImdbID, newTitle.Year, newTitle.TomatoUserRating, newTitle.TomatoURL, newTitle.User, pq.Array(newTitle.Genres))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newTitle)
}

func getTitles(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session-name")
	userID := session.Values["user_id"].(string)

	query := `SELECT id, name, createdAt, seen, seenOn, poster, imdbRating, imdbID, year, tomatoUserRating, tomatoURL, user, genres 
			  FROM titles WHERE user = $1 ORDER BY createdAt DESC`
	rows, err := db.Query(query, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var titles []Title
	for rows.Next() {
		var title Title
		err := rows.Scan(&title.ID, &title.Name, &title.CreatedAt, &title.Seen, &title.SeenOn, &title.Poster, &title.ImdbRating, &title.ImdbID, &title.Year, &title.TomatoUserRating, &title.TomatoURL, &title.User, pq.Array(&title.Genres))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		titles = append(titles, title)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(titles)
}

func getTitle(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session-name")
	userID := session.Values["user_id"].(string)

	vars := mux.Vars(r)
	titleID := vars["id"]

	query := `SELECT id, name, createdAt, seen, seenOn, poster, imdbRating, imdbID, year, tomatoUserRating, tomatoURL, user, genres 
			  FROM titles WHERE id = $1 AND user = $2`
	row := db.QueryRow(query, titleID, userID)

	var title Title
	err := row.Scan(&title.ID, &title.Name, &title.CreatedAt, &title.Seen, &title.SeenOn, &title.Poster, &title.ImdbRating, &title.ImdbID, &title.Year, &title.TomatoUserRating, &title.TomatoURL, &title.User, pq.Array(&title.Genres))
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(title)
}

func updateTitle(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session-name")
	userID := session.Values["user_id"].(string)

	vars := mux.Vars(r)
	titleID := vars["id"]

	var updatedTitle Title
	err := json.NewDecoder(r.Body).Decode(&updatedTitle)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	query := `UPDATE titles SET name = $1, seen = $2, seenOn = $3, poster = $4, imdbRating = $5, imdbID = $6, year = $7, tomatoUserRating = $8, tomatoURL = $9, genres = $10 
			  WHERE id = $11 AND user = $12 RETURNING id, name, createdAt, seen, seenOn, poster, imdbRating, imdbID, year, tomatoUserRating, tomatoURL, user, genres`
	row := db.QueryRow(query, updatedTitle.Name, updatedTitle.Seen, updatedTitle.SeenOn, updatedTitle.Poster, updatedTitle.ImdbRating, updatedTitle.ImdbID, updatedTitle.Year, updatedTitle.TomatoUserRating, updatedTitle.TomatoURL, pq.Array(updatedTitle.Genres), titleID, userID)

	var title Title
	err = row.Scan(&title.ID, &title.Name, &title.CreatedAt, &title.Seen, &title.SeenOn, &title.Poster, &title.ImdbRating, &title.ImdbID, &title.Year, &title.TomatoUserRating, &title.TomatoURL, &title.User, pq.Array(&title.Genres))
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(title)
}

func deleteTitle(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session-name")
	userID := session.Values["user_id"].(string)

	vars := mux.Vars(r)
	titleID := vars["id"]

	query := `DELETE FROM titles WHERE id = $1 AND user = $2 RETURNING id, name, createdAt, seen, seenOn, poster, imdbRating, imdbID, year, tomatoUserRating, tomatoURL, user, genres`
	row := db.QueryRow(query, titleID, userID)

	var title Title
	err := row.Scan(&title.ID, &title.Name, &title.CreatedAt, &title.Seen, &title.SeenOn, &title.Poster, &title.ImdbRating, &title.ImdbID, &title.Year, &title.TomatoUserRating, &title.TomatoURL, &title.User, pq.Array(&title.Genres))
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(title)
}
