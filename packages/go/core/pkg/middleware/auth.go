package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"core/pkg/resource"
)

func Validator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantId, ok := os.LookupEnv("TENANT_ID")
		if !ok {
			http.Error(w, "missing tenant id", http.StatusInternalServerError)
			return
		}

		apiDomainTemplate, err := resource.Get[string]("TenantDomains", "api", "nameTemplate")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		apiDomain := strings.ReplaceAll(*apiDomainTemplate, "{{tenant_id}}", tenantId)

		key, err := resource.Get[string]("HeaderKeys", "ROUTER_SECRET")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		routerSecret, err := resource.Get[string]("RouterSecret", "value")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		xfh := r.Header.Get("X-Forwarded-Host")
		xrs := r.Header.Get(*key)
		if xfh != apiDomain || xrs != *routerSecret {
			log.Printf("invalid forwarded host or secret: %s, %s", xfh, xrs)

			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
