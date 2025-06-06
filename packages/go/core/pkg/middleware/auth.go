package middleware

import (
	"log"
	"net/http"
)

type ForwardedHost struct {
	Name   string
	Secret *ForwardedHostSecret
}

type ForwardedHostSecret struct {
	Key   string
	Value string
}

func (fh *ForwardedHost) Validator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		xfh := r.Header.Get("X-Forwarded-Host")
		xs := r.Header.Get(fh.Secret.Key)
		if xfh != fh.Name || xs != fh.Secret.Value {
			log.Printf("invalid forwarded host or secret: %s, %s", xfh, xs)

			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
