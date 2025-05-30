package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/sst/sst/v3/sdk/golang/resource"
)

func ForwardedHostValidator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantId, ok := os.LookupEnv("TENANT_ID")
		if !ok {
			log.Printf("missing TENANT_ID environment variable")

			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		apiDomainTemplate, err := resource.Get("TenantDomainTemplates", "api")
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

		xfh := r.Header.Get("X-Forwarded-Host")
		xrs := r.Header.Get("X-Router-Secret")
		if xfh != apiDomain || xrs != routerSecret.(string) {
			log.Printf("invalid forwarded host or router secret: %s, %s", xfh, xrs)

			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
