package http

import (
	"net/http"
	"strings"
)

type ServeMux struct {
	*http.ServeMux
}

func NewServeMux() *ServeMux {
	return &ServeMux{http.NewServeMux()}
}

func (mux *ServeMux) HandlePrefix(prefix string, h http.Handler) {
	trimmed := strings.TrimSuffix(prefix, "/")

	mux.ServeMux.Handle(trimmed+"/", http.StripPrefix(trimmed, h))
}
