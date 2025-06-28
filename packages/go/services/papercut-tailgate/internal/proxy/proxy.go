package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"core/pkg/resource"

	"papercut-tailgate/internal/config"
	"papercut-tailgate/internal/papercut"
	"papercut-tailgate/internal/tailscale"
)

func New(cfg *config.Config, s *tailscale.Server) *httputil.ReverseProxy {
	rewrite := func(req *httputil.ProxyRequest) {
		req.Out.URL.Scheme = cfg.Target.Scheme
		req.Out.URL.Host = cfg.Target.Host
		req.Out.URL.Path, req.Out.URL.RawPath = joinURLPath(cfg.Target, req.In.URL)

		if cfg.Target.RawQuery == "" || req.Out.URL.RawQuery == "" {
			req.Out.URL.RawQuery = cfg.Target.RawQuery + req.Out.URL.RawQuery
		} else {
			req.Out.URL.RawQuery = cfg.Target.RawQuery + "&" + req.Out.URL.RawQuery
		}

		apiPath, err := resource.Get[string]("PapercutServer", "paths", "webServicesApi")
		if err != nil {
			log.Printf(err.Error())
			return
		}

		if strings.ToLower(strings.TrimSuffix(req.Out.URL.Path, "/")) == apiPath {
			key, err := resource.Get[string]("HeaderKeys", "PAPERCUT_INJECT_AUTH")
			if err != nil {
				log.Printf(err.Error())
				return
			}

			switch strings.ToLower(strings.TrimSpace(req.In.Header.Get(key))) {
			case "1", "true", "yes", "on":
				if err := papercut.InjectAuthToken(req, cfg.AuthToken); err != nil {
					log.Printf("failed to inject papercut auth token: %v", err)
				}
			}
		}
	}

	return &httputil.ReverseProxy{
		Rewrite: rewrite,
		Transport: &http.Transport{
			DialContext: s.Dial,
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
