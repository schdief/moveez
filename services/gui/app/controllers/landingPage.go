package controllers

import (
	"net/http"
)

func LandingPage(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Welcome to ` + os.Getenv("RELEASE") + `!"}`))
		return
	}
	http.ServeFile(w, r, "views/landingPage/index.html")
}
