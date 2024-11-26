package controllers

import (
	"net/http"
	"text/template"
)

func Impressum(w http.ResponseWriter, r *http.Request) {
	username := ""
	if user, ok := r.Context().Value("user").(string); ok {
		username = user
	}
	tmpl, err := template.ParseFiles("views/impressum/index.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	data := struct {
		Username string
	}{
		Username: username,
	}
	tmpl.Execute(w, data)
}
