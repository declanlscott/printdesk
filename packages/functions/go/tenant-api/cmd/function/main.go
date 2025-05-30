package function

import (
	"github.com/aws/aws-lambda-go/lambda"

	"tenant-api/internal/proxy"
	"tenant-api/internal/router"
)

func main() {
	mux := router.New()
	adapter := proxy.NewHandlerAdapter(mux)

	lambda.Start(adapter.ProxyWithContext)
}
