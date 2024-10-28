package main

import (
    "encoding/json"
    "fmt"
    "html/template"
    "log"
    "net/http"
    "os"

    "github.com/gorilla/sessions"
    "github.com/gorilla/mux"
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/facebook"
)

var (
    store = sessions.NewCookieStore([]byte("secret-key"))
    facebookOAuthConfig = &oauth2.Config{
        ClientID:     "YOUR_FACEBOOK_APP_ID",
        ClientSecret: "YOUR_FACEBOOK_APP_SECRET",
        RedirectURL:  "http://localhost:80/auth/facebook/callback",
        Scopes:       []string{"email"},
        Endpoint:     facebook.Endpoint,
    }
)

type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    r := mux.NewRouter()

    // Routes
    r.HandleFunc("/", landingPage).Methods("GET")
    r.HandleFunc("/health", healthCheck).Methods("GET")
    r.HandleFunc("/auth/facebook", facebookLogin).Methods("GET")
    r.HandleFunc("/auth/facebook/callback", facebookCallback).Methods("GET")
    r.HandleFunc("/logout", logout).Methods("GET")

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "80"
    }
    log.Printf("Server started on :%s\n", port)
    log.Fatal(http.ListenAndServe(":"+port, r))
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
}

func landingPage(w http.ResponseWriter, r *http.Request) {
    tmpl, err := template.ParseFiles("views/index.html")
    if err != nil {
        http.Error(w, "Failed to load template", http.StatusInternalServerError)
        return
    }
    tmpl.Execute(w, nil)
}

func facebookLogin(w http.ResponseWriter, r *http.Request) {
    url := facebookOAuthConfig.AuthCodeURL("state")
    http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func facebookCallback(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    token, err := facebookOAuthConfig.Exchange(oauth2.NoContext, code)
    if err != nil {
        http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
        return
    }

    client := facebookOAuthConfig.Client(oauth2.NoContext, token)
    resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email")
    if err != nil {
        http.Error(w, "Failed to get user info", http.StatusInternalServerError)
        return
    }
    defer resp.Body.Close()

    var user User
    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
        http.Error(w, "Failed to parse user info", http.StatusInternalServerError)
        return
    }

    // Store user info in session
    session, _ := store.Get(r, "session-name")
    session.Values["authenticated"] = true
    session.Values["user"] = user
    session.Save(r, w)

    fmt.Fprintf(w, "Successfully authenticated with Facebook! Welcome, %s!", user.Name)
}

func logout(w http.ResponseWriter, r *http.Request) {
    // Handle logout
    session, _ := store.Get(r, "session-name")
    session.Values["authenticated"] = false
    session.Save(r, w)
    http.Redirect(w, r, "/", http.StatusFound)
}

