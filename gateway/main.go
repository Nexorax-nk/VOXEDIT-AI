package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

func main() {
	// Destination backend (Python FastAPI)
	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://localhost:8000"
	}

	parsedURL, err := url.Parse(backendURL)
	if err != nil {
		log.Fatalf("Failed to parse backend URL: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(parsedURL)

	// Logging middleware
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Proxying request: %s %s -> %s", r.Method, r.URL.Path, backendURL)
		
		// We could add custom logic here (e.g. rate limiting, auth checking, handling heavy uploads)
		// For now, we simply proxy to the Python backend
		proxy.ServeHTTP(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Golang API Gateway listening on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Gateway server error: %v", err)
	}
}
