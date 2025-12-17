package proxy

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"sync"
	"time"

	"core/pkg/http/middleware"
	"core/pkg/http/multiplexer"
	"core/pkg/sst"

	"papercut-gateway/internal/config"
	"papercut-gateway/internal/tailscale"
)

type Handler struct {
	mu  sync.RWMutex
	s   *tailscale.Server
	p   *httputil.ReverseProxy
	cfg *config.Config

	stopCh    chan struct{}
	stoppedCh chan struct{}
	started   bool
}

func NewHandler() *Handler {
	return &Handler{
		stopCh:    make(chan struct{}),
		stoppedCh: make(chan struct{}),
	}
}

func (h *Handler) Start(ctx context.Context, cfgAgtToken string) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.started {
		return fmt.Errorf("proxy handler already started")
	}

	if err := h.initialize(ctx, cfgAgtToken); err != nil {
		return err
	}

	h.started = true

	go h.tickerReload(ctx, cfgAgtToken)

	return nil
}

func (h *Handler) initialize(ctx context.Context, cfgAgtToken string) error {
	cfg, err := config.Load(ctx, cfgAgtToken)
	if err != nil {
		return err
	}

	c := tailscale.NewClient(cfg.TailscaleClientCredentials)
	s, err := c.NewServer(ctx)
	if err != nil {
		return err
	}

	p := New(cfg, s)

	h.cfg = cfg
	h.s = s
	h.p = p

	return nil
}

func (h *Handler) tickerReload(ctx context.Context, cfgAgtToken string) {
	defer close(h.stoppedCh)

	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-h.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			cfgCtx, cancel := context.WithTimeout(ctx, 30*time.Second)

			if err := h.hotReload(cfgCtx, cfgAgtToken); err != nil {
				log.Printf("failed to hot reload configuration: %v", err)
			}

			cancel()
		}
	}
}

func (h *Handler) hotReload(ctx context.Context, cfgAgtToken string) error {
	cfg, err := config.Load(ctx, cfgAgtToken)
	if err != nil {
		return err
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	currentCfg := h.cfg
	if currentCfg == nil {
		return fmt.Errorf("missing current configuration")
	}

	var (
		hasChanges bool
		s          *tailscale.Server
	)

	if currentCfg.TailscaleClientCredentials.ClientID != cfg.TailscaleClientCredentials.ClientID ||
		currentCfg.TailscaleClientCredentials.ClientSecret != cfg.TailscaleClientCredentials.ClientSecret {
		hasChanges = true

		c := tailscale.NewClient(cfg.TailscaleClientCredentials)
		if s, err = c.NewServer(ctx); err != nil {
			return err
		}
	} else {
		s = h.s
	}

	if currentCfg.PapercutWebServicesAuthToken != cfg.PapercutWebServicesAuthToken || currentCfg.PapercutTailscaleServiceTarget.String() != cfg.PapercutTailscaleServiceTarget.String() {
		hasChanges = true
	}

	if hasChanges {
		prev := h.s

		h.s = s
		h.p = New(cfg, s)
		h.cfg = cfg

		if prev != nil {
			go func() {
				if err := prev.Close(); err != nil {
					log.Printf("failed to close tailscale server: %v", err)
				}
			}()
		}
	}

	return nil
}

func (h *Handler) NewHTTPHandler() (http.Handler, error) {
	prefix, err := sst.Resource[string]("PapercutServer", "paths", "prefix")
	if err != nil {
		return nil, err
	}

	mux := multiplexer.NewServeMux()
	mux.HandlePrefix(prefix, h)

	mw := middleware.Chain(
		middleware.Recovery,
		middleware.Logger,
		middleware.Validator,
	)

	return mw(mux), nil
}

func (h *Handler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	h.mu.RLock()
	p := h.p
	started := h.started
	h.mu.RUnlock()

	if !started {
		http.Error(rw, "proxy handler not started", http.StatusServiceUnavailable)
		return
	}

	if p == nil {
		http.Error(rw, "proxy not available", http.StatusServiceUnavailable)
		return
	}

	p.ServeHTTP(rw, req)
}

func (h *Handler) Stop() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if !h.started {
		return fmt.Errorf("proxy handler already stopped")
	}

	select {
	case <-h.stopCh:
	default:
		close(h.stopCh)
	}

	h.mu.Unlock()
	<-h.stoppedCh
	h.mu.Lock()

	if h.s != nil {
		if err := h.s.Close(); err != nil {
			log.Printf("failed to close tailscale server: %v", err)
		}
		h.s = nil
	}
	h.p = nil
	h.started = false

	return nil
}
