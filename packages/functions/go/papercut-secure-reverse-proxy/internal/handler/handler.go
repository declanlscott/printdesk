package handler

import (
	"context"
	"papercut-secure-reverse-proxy/internal/lifecycle"
	"strings"

	"github.com/aws/aws-lambda-go/events"
)

func Handler(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	req.Path = strings.TrimPrefix(req.Path, "/papercut/server")

	return lifecycle.HandlerAdapter.ProxyWithContext(ctx, req)
}
