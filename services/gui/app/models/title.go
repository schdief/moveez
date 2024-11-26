package models

import (
	"time"
)

// Title struct definition
type Title struct {
	Name            string    `json:"name" bson:"name" validate:"required"`
	CreatedAt       time.Time `json:"createdAt" bson:"createdAt" validate:"required"`
	Seen            bool      `json:"seen" bson:"seen"`
	SeenOn          time.Time `json:"seenOn" bson:"seenOn"`
	Poster          string    `json:"poster" bson:"poster"`
	ImdbRating      float64   `json:"imdbRating" bson:"imdbRating"`
	ImdbID          string    `json:"imdbID" bson:"imdbID"`
	Year            string    `json:"year" bson:"year"`
	TomatoUserRating float64  `json:"tomatoUserRating" bson:"tomatoUserRating"`
	TomatoURL       string    `json:"tomatoURL" bson:"tomatoURL"`
	User            string    `json:"user" bson:"user"`
	Genres          []string  `json:"genres" bson:"genres"`
}
