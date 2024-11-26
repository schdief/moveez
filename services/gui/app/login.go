package main

import (
	"net/http"
	"os"
	"io/ioutil"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"github.com/gorilla/sessions"
	"github.com/gorilla/pat"
)

var (
	facebookAppID     = "320908101860577"
	facebookAppSecret = os.Getenv("FACEBOOK_APP_SECRET")
	facebookAppSecretPath = os.Getenv("FACEBOOK_APP_SECRET_PATH")
	devMode           = os.Getenv("NODE_ENV") == ""
	localAuth         = os.Getenv("AUTH") == "basic" || os.Getenv("NODE_ENV") == "uat"
	store             = sessions.NewCookieStore([]byte("secret"))
	oauth2Config      = &oauth2.Config{
		ClientID:     facebookAppID,
		ClientSecret: facebookAppSecret,
		RedirectURL:  "https://www.moveez.de/auth/facebook/callback",
		Scopes:       []string{"email"},
		Endpoint:     facebook.Endpoint,
	}
)

func init() {
	if facebookAppSecret == "" && facebookAppSecretPath != "" {
		secret, err := ioutil.ReadFile(facebookAppSecretPath)
		if err != nil {
			panic(err)
		}
		facebookAppSecret = string(secret)
		oauth2Config.ClientSecret = facebookAppSecret
	}
}

func main() {
	r := pat.New()
	r.HandleFunc("/auth/facebook", handleFacebookLogin)
	r.HandleFunc("/auth/facebook/callback", handleFacebookCallback)
	r.HandleFunc("/logout", handleLogout)
	http.Handle("/", r)
	http.ListenAndServe(":8080", nil)
}

func handleFacebookLogin(w http.ResponseWriter, r *http.Request) {
	url := oauth2Config.AuthCodeURL("state", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleFacebookCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := oauth2Config.Exchange(oauth2.NoContext, code)
	if err != nil {
		http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
		return
	}

	session, _ := store.Get(r, "session-name")
	session.Values["token"] = token
	session.Save(r, w)

	http.Redirect(w, r, "/title", http.StatusTemporaryRedirect)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session-name")
	delete(session.Values, "token")
	session.Save(r, w)
	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}
