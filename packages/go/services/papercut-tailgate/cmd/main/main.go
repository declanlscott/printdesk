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

	initialCfg, err := config.Load(ctx)
	if err != nil {
		log.Fatalf("failed to load configuration: %v", err)
	}

	ph := proxy.NewHandler(initialCfg)

	go ph.StartConfigReloader(ctx, initialCfg)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", config.Global.Port),
		Handler: ph.NewHTTPHandler(),
	}

	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("http server error: %v", err)
	}
}
