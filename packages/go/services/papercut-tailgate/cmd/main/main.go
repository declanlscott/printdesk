package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"

	"papercut-tailgate/internal/config"
	"papercut-tailgate/internal/proxy"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load(ctx)
	if err != nil {
		log.Fatalf("failed to load configuration: %v", err)
	}

	handler := proxy.NewHandler(proxy.New(cfg))

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", config.Global.Port),
		Handler: handler,
	}

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("http server error: %v", err)
	}
}
