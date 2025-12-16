package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"core/pkg/sst"
)

func Validator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantId, ok := os.LookupEnv("TENANT_ID")
		if !ok {
			http.Error(w, "missing tenant id", http.StatusInternalServerError)
			return
		}

		apiDomainTemplate, err := sst.Resource[string]("TenantDomains", "api", "nameTemplate")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		expectedForwardedHost := strings.ReplaceAll(apiDomainTemplate, "{{tenant_id}}", tenantId)
		receivedForwardedHost := r.Header.Get("X-Forwarded-Host")
		if receivedForwardedHost != expectedForwardedHost {
			log.Printf("Expected forwarded host %s, received %s", expectedForwardedHost, receivedForwardedHost)

			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		expectedRouterSecret, err := sst.Resource[string]("RouterSecret", "value")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		routerSecretHeaderKey, err := sst.Resource[string]("HeaderNames", "ROUTER_SECRET")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		receivedRouterSecret := r.Header.Get(routerSecretHeaderKey)
		if receivedRouterSecret != expectedRouterSecret {
			log.Printf("invalid router secret: %s", receivedRouterSecret)
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
