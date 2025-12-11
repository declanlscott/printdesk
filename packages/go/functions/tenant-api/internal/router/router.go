package router

import (
	"net/http"

	_http "core/pkg/http"
	"core/pkg/middleware"

	"tenant-api/internal/handlers"
)

func New() http.Handler {
	mux := _http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mux.HandlePrefix("/documents", documents())
	mux.HandlePrefix("/papercut", papercut())
	mux.HandlePrefix("/tailscale", tailscale())

	mw := middleware.Chain(
		middleware.Recovery,
		middleware.Logger,
		middleware.Validator,
	)

	return mw(mux)
}

func documents() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("PUT /mime-types", handlers.SetDocumentsMimeTypes)
	mux.HandleFunc("PUT /size-limit", handlers.SetDocumentsSizeLimit)
	mux.HandleFunc("GET /mime-types", handlers.GetDocumentsMimeTypes)
	mux.HandleFunc("GET /size-limit", handlers.GetDocumentsSizeLimit)

	return mux
}

func papercut() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("PUT /tailnet-uri", handlers.SetPapercutServerTailnetUri)
	mux.HandleFunc("PUT /auth-token", handlers.SetPapercutServerAuthToken)

	return mux
}

func tailscale() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("PUT /oauth-client", handlers.SetTailscaleOAuthClient)

	return mux
}
