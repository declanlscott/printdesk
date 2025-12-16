package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"papercut-tailgate/internal/proxy"
)

func main() {
	ctx := context.Background()

	ph := proxy.NewHandler()

	const cfgAgtTokenKey = "APPCONFIG_AGENT_ACCESS_TOKEN"
	cfgAgtToken, ok := os.LookupEnv(cfgAgtTokenKey)
	if !ok {
		log.Fatalf("%s environment variable not set", cfgAgtTokenKey)
	}

	go func() {
		if err := ph.Start(ctx, cfgAgtToken); err != nil {
			log.Fatalf("failed to start proxy handler: %v", err)
		}
	}()

	h, err := ph.NewHTTPHandler()
	if err != nil {
		log.Fatalf("failed to initialize http handler: %v", err)
	}

	port, ok := os.LookupEnv("PORT")
	if !ok {
		port = "8080"
	}

	s := &proxy.Server{
		ProxyHandler: ph,
		Server: &http.Server{
			Addr:    fmt.Sprintf(":%s", port),
			Handler: h,
		},
	}

	if err := s.Start(ctx); err != nil {
		log.Fatalf("http server error: %v", err)
	}
}
