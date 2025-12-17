package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"core/pkg/sst"

	"papercut-gateway/internal/config"
	"papercut-gateway/internal/papercut"
	"papercut-gateway/internal/tailscale"
)

func New(cfg *config.Config, s *tailscale.Server) *httputil.ReverseProxy {
	rewrite := func(req *httputil.ProxyRequest) {
		target := cfg.PapercutTailscaleServiceTarget

		req.Out.URL.Scheme = target.Scheme
		req.Out.URL.Host = target.Host
		req.Out.URL.Path, req.Out.URL.RawPath = joinURLPath(target, req.In.URL)

		if target.RawQuery == "" || req.Out.URL.RawQuery == "" {
			req.Out.URL.RawQuery = target.RawQuery + req.Out.URL.RawQuery
		} else {
			req.Out.URL.RawQuery = target.RawQuery + "&" + req.Out.URL.RawQuery
		}

		if req.Out.Method == "POST" && req.Out.Header.Get("Content-Type") == "application/xml" {
			webServicesPath, err := sst.Resource[string]("Papercut", "webServicesPath")
			if err != nil {
				log.Printf(err.Error())
				return
			}

			if strings.TrimSuffix(req.Out.URL.Path, "/") == webServicesPath {
				key, err := sst.Resource[string]("HeaderNames", "PAPERCUT_GATEWAY_INJECT_WEB_SERVICES_AUTH_TOKEN")
				if err != nil {
					log.Printf(err.Error())
					return
				}

				switch strings.ToLower(strings.TrimSpace(req.In.Header.Get(key))) {
				case "1", "true", "yes", "on":
					if err := papercut.InjectWebServicesAuthToken(req, cfg.PapercutWebServicesAuthToken); err != nil {
						log.Printf("failed to inject papercut web services auth token: %v", err)
					}
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
