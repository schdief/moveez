package main

import (
	"github.com/gorilla/sessions"
	"math/rand"
	"time"
)

func initializeSession() *sessions.CookieStore {
	rand.Seed(time.Now().UnixNano())
	sessionSecret := randString(32)
	store := sessions.NewCookieStore([]byte(sessionSecret))
	store.Options = &sessions.Options{
		Secure:   true,
		HttpOnly: true,
	}
	return store
}

func randString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
