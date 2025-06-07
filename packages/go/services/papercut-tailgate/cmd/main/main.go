package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"tailscale.com/tsnet"

	"papercut-tailgate/internal/config"
	"papercut-tailgate/internal/proxy"
	"papercut-tailgate/internal/tailscale"
)

var (
	once sync.Once
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load(ctx)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	tsc := cfg.Tailscale.OAuthClient.NewClient()

	key, err := tailscale.CreateAuthKey(ctx, tsc)
	if err != nil {
		log.Fatalf("failed to create auth key: %v", err)
	}

	tss, err := tailscale.NewServer(key.Key)
	if err != nil {
		log.Fatalf("failed to create tailscale server: %v", err)
	}

	_, err = tss.Up(ctx)
	if err != nil {
		log.Fatalf("failed to start tailscale server: %v", err)
	}

	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGTERM, syscall.SIGINT, syscall.SIGQUIT, syscall.SIGHUP)
	go shutdown(ch, ctx, tss)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Proxy.Port),
		Handler: http.StripPrefix("/papercut/server", proxy.New(cfg.Proxy.Target.URL, tss.Dial)),
	}

	if err := server.ListenAndServe(); err != nil {
		_ = tss.Close()
		log.Fatalf("proxy server error: %v", err)
	}
}

func shutdown(ch <-chan os.Signal, ctx context.Context, tss *tsnet.Server) {
	sig := <-ch
	log.Printf("%v signal received\n", sig)

	once.Do(func() {
		log.Println("graceful shutdown ...")

		timeoutCtx, cancel := context.WithTimeout(ctx, 100*time.Second)
		defer cancel()

		wg := sync.WaitGroup{}
		wg.Add(1)

		go func() {
			defer wg.Done()
			_ = tss.Close()
		}()

		done := make(chan struct{})
		go func() {
			defer close(done)
			wg.Wait()
		}()

		select {
		case <-timeoutCtx.Done():
			log.Println("graceful shutdown timed out")
		case <-done:
			log.Println("graceful shutdown completed successfully")
		}

		log.Println("exiting ...")
		os.Exit(0)
	})
}
