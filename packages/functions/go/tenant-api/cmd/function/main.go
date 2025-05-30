package function

import (
	"tenant-api/internal/middleware"
	"tenant-api/internal/proxy"
	"tenant-api/internal/router"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	mux := router.New()
	mw := middleware.Chain(
		middleware.Recovery,
		middleware.Logger,
	)
	handler := mw(mux)
	adapter := proxy.NewHandlerAdapter(handler)

	lambda.Start(adapter.ProxyWithContext)
}
