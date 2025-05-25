package proxy

import (
	"context"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func New(
	target *url.URL,
	dial func(ctx context.Context, network string, addr string) (net.Conn, error),
) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Transport = &http.Transport{
		DialContext: dial,
	}

	return proxy
}

func Handler(handler http.Handler) http.Handler {
	return http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			handler.ServeHTTP(w, r)
		})
}
