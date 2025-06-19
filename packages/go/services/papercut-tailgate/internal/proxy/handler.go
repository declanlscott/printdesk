package proxy

import (
	"net/http"
	"net/http/httputil"
	"sync"

	"core/pkg/middleware"
)

type Handler struct {
	mu    sync.RWMutex
	proxy *httputil.ReverseProxy
}

func NewHandler(proxy *httputil.ReverseProxy) http.Handler {
	handler := &Handler{}
	handler.SetProxy(proxy)

	mux := http.NewServeMux()
	mux.Handle("/papercut/server/", http.StripPrefix("/papercut/server", handler))

	mw := middleware.Chain(
		middleware.Recovery,
		middleware.Logger,
		middleware.Validator,
	)

	return mw(mux)
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proxy := h.GetProxy()

	if proxy == nil {
		http.Error(w, "Proxy not configured", http.StatusServiceUnavailable)
		return
	}

	proxy.ServeHTTP(w, r)
}

func (h *Handler) GetProxy() *httputil.ReverseProxy {
	h.mu.RLock()
	defer h.mu.RUnlock()

	return h.proxy
}

func (h *Handler) SetProxy(proxy *httputil.ReverseProxy) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.proxy = proxy
}
