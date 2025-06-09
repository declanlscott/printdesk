package router

import (
	"log"
	"net/http"
	"os"
	"strings"

	"core/pkg/middleware"
	"tenant-api/internal/handlers"

	"github.com/sst/sst/v3/sdk/golang/resource"
)

func New() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mux.Handle("/config/", http.StripPrefix("/config", config()))

	mw := middleware.Chain(
		middleware.Recovery,
		middleware.Logger,
		func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				tenantId, ok := os.LookupEnv("TENANT_ID")
				if !ok {
					log.Printf("missing TENANT_ID environment variable")

					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}

				apiDomainTemplate, err := resource.Get("TenantDomains", "api", "nameTemplate")
				if err != nil {
					log.Printf("failed retrieving TenantDomainTemplates.api resource: %v", err)

					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}
				apiDomain := strings.ReplaceAll(apiDomainTemplate.(string), "{{tenant_id}}", tenantId)

				routerSecret, err := resource.Get("RouterSecret", "value")
				if err != nil {
					log.Printf("failed retrieving RouterSecret.value resource: %v", err)

					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}

				forwardedHost := &middleware.ForwardedHost{
					Name: apiDomain,
					Secret: &middleware.ForwardedHostSecret{
						Key:   "X-Router-Secret",
						Value: routerSecret.(string),
					},
				}

				forwardedHost.Validator(next).ServeHTTP(w, r)
			})
		},
	)

	return mw(mux)
}

func config() http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/app/settings/", http.StripPrefix("/app/settings", appSettings()))
	mux.Handle("/papercut/", http.StripPrefix("/papercut", papercut()))
	mux.Handle("/tailscale/", http.StripPrefix("/tailscale", tailscale()))

	return mux
}

func appSettings() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("PUT /documents/mime-types", handlers.SetDocumentsMimeTypes)
	mux.HandleFunc("PUT /documents/size-limit", handlers.SetDocumentsSizeLimit)
	mux.HandleFunc("GET /documents/mime-types", handlers.GetDocumentsMimeTypes)
	mux.HandleFunc("GET /documents/size-limit", handlers.GetDocumentsSizeLimit)

	return mux
}

func papercut() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("PUT /server/tailnet-uri", handlers.SetPapercutServerTailnetUri)
	mux.HandleFunc("PUT /server/auth-token", handlers.SetPapercutServerAuthToken)

	return mux
}

func tailscale() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("PUT /oauth-client", handlers.SetTailscaleOAuthClient)

	return mux
}
