package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"

	"papercut-tailgate/internal/config"
	"papercut-tailgate/internal/proxy"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load(ctx)
	if err != nil {
		log.Fatalf("failed to load runtime configuration: %v", err)
	}

	ph := proxy.NewHandler(cfg)

	go ph.AutoReload(ctx, cfg)

	port, ok := os.LookupEnv("PORT")
	if !ok {
		port = "8080"
	}

	h, err := ph.NewHTTPHandler()
	if err != nil {
		log.Fatalf("failed to initialize http handler: %v", err)
	}

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: h,
	}

	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("http server error: %v", err)
	}
}
