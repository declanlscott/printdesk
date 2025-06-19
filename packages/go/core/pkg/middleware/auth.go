package middleware

import (
	"core/pkg/env"
	"log"
	"net/http"
	"strings"

	"core/pkg/resource"
)

func Validator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantId, err := env.Get("TENANT_ID")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		apiDomainTemplate, err := resource.Get("TenantDomains", "api", "nameTemplate")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		apiDomain := strings.ReplaceAll(apiDomainTemplate.(string), "{{tenant_id}}", *tenantId)

		routerSecret, err := resource.Get("RouterSecret", "value")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		xfh := r.Header.Get("X-Forwarded-Host")
		xs := r.Header.Get("X-Router-Secret")
		if xfh != apiDomain || xs != routerSecret.(string) {
			log.Printf("invalid forwarded host or secret: %s, %s", xfh, xs)

			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
