package router

import (
	"net/http"

	"core/pkg/middleware"

	"tenant-api/internal/handlers"
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
		middleware.Validator,
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
