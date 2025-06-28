package proxy

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"sync"
	"time"

	_http "core/pkg/http"
	"core/pkg/middleware"
	"core/pkg/resource"

	"papercut-tailgate/internal/config"
	"papercut-tailgate/internal/tailscale"
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

func (h *Handler) Start(ctx context.Context) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.started {
		return errors.New("proxy handler already started")
	}

	if err := h.initialize(ctx); err != nil {
		return err
	}

	h.started = true

	go h.autoReload(ctx)

	return nil
}

func (h *Handler) initialize(ctx context.Context) error {
	cfg, err := config.Load(ctx)
	if err != nil {
		return err
	}

	c := tailscale.NewClient(cfg.OAuth)
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

func (h *Handler) autoReload(ctx context.Context) {
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

			if err := h.hotReload(cfgCtx); err != nil {
				log.Printf("failed to hotReload configuration: %v", err)
			}

			cancel()
		}
	}
}

func (h *Handler) hotReload(ctx context.Context) error {
	cfg, err := config.Load(ctx)
	if err != nil {
		return err
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	currentCfg := h.cfg
	if currentCfg == nil {
		return errors.New("nil current configuration")
	}

	var (
		hasChanges bool
		s          *tailscale.Server
	)

	if currentCfg.OAuth.ClientID != cfg.OAuth.ClientID ||
		currentCfg.OAuth.ClientSecret != cfg.OAuth.ClientSecret {
		hasChanges = true

		c := tailscale.NewClient(cfg.OAuth)
		if s, err = c.NewServer(ctx); err != nil {
			return err
		}
	} else {
		s = h.s
	}

	if currentCfg.AuthToken != cfg.AuthToken || currentCfg.Target.String() != cfg.Target.String() {
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
	prefix, err := resource.Get[string]("PapercutServer", "paths", "prefix")
	if err != nil {
		return nil, err
	}

	mux := _http.NewServeMux()
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
		return errors.New("proxy handler already stopped")
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
