package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"

	"papercut-tailgate/internal/proxy"
)

func main() {
	ctx := context.Background()

	ph := proxy.NewHandler()

	go func() {
		if err := ph.Start(ctx); err != nil {
			log.Fatalf("failed to start proxy handler: %v", err)
		}
	}()

	port, ok := os.LookupEnv("PORT")
	if !ok {
		port = "8080"
	}

	h, err := ph.NewHTTPHandler()
	if err != nil {
		log.Fatalf("failed to initialize http handler: %v", err)
	}

	s := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: h,
	}

	if err := s.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("http server error: %v", err)
	}
}
