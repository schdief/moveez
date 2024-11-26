package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	app := createApp()

	// PARAMETERS
	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	tlsKeyPath := os.Getenv("TLS_KEY_PATH")
	tlsCrtPath := os.Getenv("TLS_CRT_PATH")

	// SERVER
	host := "0.0.0.0"
	mode := os.Getenv("NODE_ENV")
	if mode == "" {
		mode = "default"
	}
	release := os.Getenv("RELEASE")
	if release == "" {
		release = "snapshot"
	}

	if mode == "default" && os.Getenv("AUTH") == "" {
		privateKey, err := ioutil.ReadFile(tlsKeyPath)
		if err != nil {
			log.Fatalf("failed to read private key: %v", err)
		}
		certificate, err := ioutil.ReadFile(tlsCrtPath)
		if err != nil {
			log.Fatalf("failed to read certificate: %v", err)
		}

		cert, err := tls.X509KeyPair(certificate, privateKey)
		if err != nil {
			log.Fatalf("failed to create X509 key pair: %v", err)
		}

		tlsConfig := &tls.Config{
			Certificates: []tls.Certificate{cert},
			MinVersion:   tls.VersionTLS12,
		}

		server := &http.Server{
			Addr:         fmt.Sprintf("%s:%s", host, port),
			Handler:      app,
			TLSConfig:    tlsConfig,
			ReadTimeout:  5 * time.Second,
			WriteTimeout: 10 * time.Second,
			IdleTimeout:  15 * time.Second,
		}

		log.Println("🍿🍿🍿 MOVEEZ - manage your binge!")
		log.Printf("%s started with TLS on %s:%s\n", release, host, port)
		log.Println("mode:", mode)
		log.Printf("ketchup: %s\n", os.Getenv("KETCHUP_ENDPOINT"))

		if err := server.ListenAndServeTLS("", ""); err != nil {
			log.Fatalf("failed to start server: %v", err)
		}
	} else {
		server := &http.Server{
			Addr:         fmt.Sprintf("%s:%s", host, port),
			Handler:      app,
			ReadTimeout:  5 * time.Second,
			WriteTimeout: 10 * time.Second,
			IdleTimeout:  15 * time.Second,
		}

		log.Println("🍿🍿🍿 MOVEEZ - manage your binge!")
		log.Printf("%s started on %s:%s\n", release, host, port)
		log.Println("mode:", mode)
		log.Printf("ketchup: %s\n", os.Getenv("KETCHUP_ENDPOINT"))

		if err := server.ListenAndServe(); err != nil {
			log.Fatalf("failed to start server: %v", err)
		}
	}
}
