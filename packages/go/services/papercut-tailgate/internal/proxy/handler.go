package proxy

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"papercut-tailgate/internal/config"
	"sync"
	"time"

	"core/pkg/middleware"
)

type Handler struct {
	mu  sync.RWMutex
	pxy *httputil.ReverseProxy
}

func NewHandler(cfg *config.RuntimeConfig) *Handler {
	return &Handler{
		pxy: New(cfg),
	}
}

func (h *Handler) NewHTTPHandler() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/papercut/server/", http.StripPrefix("/papercut/server", h))

	mw := middleware.Chain(
		middleware.Recovery,
		middleware.Logger,
		middleware.Validator,
	)

	return mw(mux)
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	pxy := h.pxy
	h.mu.RUnlock()

	if pxy == nil {
		http.Error(w, "Proxy not configured", http.StatusServiceUnavailable)
		return
	}

	pxy.ServeHTTP(w, r)
}

func (h *Handler) AutoReload(ctx context.Context, initialCfg *config.RuntimeConfig) {
	cfg := *initialCfg
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		newCfg, err := config.Load(ctx)
		if err != nil {
			log.Printf("failed to reload configuration: %v", err)
			continue
		}

		if cfg.HasChanged(newCfg) {
			h.mu.Lock()
			if err := cfg.Tailscale.Server.Close(); err != nil {
				log.Printf("failed to close tailscale server: %v", err)
			}
			h.pxy = New(newCfg)
			h.mu.Unlock()

			cfg = *newCfg
		}
	}
}
