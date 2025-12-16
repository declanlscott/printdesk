package proxy

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type Server struct {
	ProxyHandler *Handler
	*http.Server
}

func (s *Server) Start(ctx context.Context) error {
	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, syscall.SIGTERM, syscall.SIGINT, syscall.SIGQUIT, syscall.SIGHUP)
	defer signal.Stop(stopCh)

	go func() {
		<-stopCh
		log.Printf("stop signal received, shutting down gracefully ...")

		if err := s.Stop(ctx); err != nil {
			log.Fatalf("failed to stop proxy server: %v", err)
		}
	}()

	if err := s.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}

func (s *Server) Stop(ctx context.Context) error {
	timeoutCtx, cancel := context.WithTimeout(ctx, 2*time.Minute-5*time.Second)
	defer cancel()

	if err := s.Server.Shutdown(timeoutCtx); err != nil {
		return err
	}

	if err := s.ProxyHandler.Stop(); err != nil {
		return err
	}

	return nil
}
