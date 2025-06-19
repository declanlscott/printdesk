package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"papercut-tailgate/internal/config"
)

func New(cfg *config.RuntimeConfig) *httputil.ReverseProxy {
	rewrite := func(req *httputil.ProxyRequest) {
		req.Out.URL.Scheme = cfg.Target.Scheme
		req.Out.URL.Host = cfg.Target.Host
		req.Out.URL.Path, req.Out.URL.RawPath = joinURLPath(req.In.URL, cfg.Target)

		if cfg.Target.RawQuery == "" || req.Out.URL.RawQuery == "" {
			req.Out.URL.RawQuery = cfg.Target.RawQuery + req.Out.URL.RawQuery
		} else {
			req.Out.URL.RawQuery = cfg.Target.RawQuery + "&" + req.Out.URL.RawQuery
		}

		// TODO: Inject papercut auth token into the request body if the header is set
	}

	return &httputil.ReverseProxy{
		Rewrite: rewrite,
		Transport: &http.Transport{
			DialContext: cfg.Tailscale.Server.Dial,
		},
	}
}

func joinURLPath(a, b *url.URL) (path, rawPath string) {
	if a.RawPath == "" && b.RawPath == "" {
		return singleJoiningSlash(a.Path, b.Path), ""
	}

	// Same as singleJoiningSlash, but uses EscapedPath to determine
	// whether a slash should be added
	aPath := a.EscapedPath()
	bPath := b.EscapedPath()

	aSlash := strings.HasSuffix(aPath, "/")
	bSlash := strings.HasPrefix(bPath, "/")

	switch {
	case aSlash && bSlash:
		return a.Path + b.Path[1:], aPath + bPath[1:]
	case !aSlash && !bSlash:
		return a.Path + "/" + b.Path, aPath + "/" + bPath
	}

	return a.Path + b.Path, aPath + bPath
}

func singleJoiningSlash(a, b string) string {
	aSlash := strings.HasSuffix(a, "/")
	bSlash := strings.HasPrefix(b, "/")

	switch {
	case aSlash && bSlash:
		return a + b[1:]
	case !aSlash && !bSlash:
		return a + "/" + b
	}

	return a + b
}
