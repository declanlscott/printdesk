package proxy

import (
	"context"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
)

type HandlerAdapter struct {
	RequestAccessor
	handler http.Handler
}

func NewHandlerAdapter(handler http.Handler) *HandlerAdapter {
	return &HandlerAdapter{
		handler: handler,
	}
}

// Proxy receives an API Gateway proxy event, transforms it into an http.Request
// object, and sends it to the http.HandlerFunc for routing.
// It returns a proxy response object generated from the http.ResponseWriter.
func (h *HandlerAdapter) Proxy(event events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	req, err := h.ProxyEventToHTTPRequest(event)

	return h.proxyInternal(req, err)
}

// ProxyWithContext receives context and an API Gateway proxy event,
// transforms them into an http.Request object, and sends it to the http.Handler for routing.
// It returns a proxy response object generated from the http.ResponseWriter.
func (h *HandlerAdapter) ProxyWithContext(ctx context.Context, event events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	req, err := h.EventToRequestWithContext(ctx, event)

	return h.proxyInternal(req, err)
}

func (h *HandlerAdapter) proxyInternal(req *http.Request, err error) (events.APIGatewayV2HTTPResponse, error) {
	if err != nil {
		return GatewayTimeout(), NewLoggedError("could not convert proxy event to request: %v", err)
	}

	w := NewResponseWriter()
	h.handler.ServeHTTP(http.ResponseWriter(w), req)

	res, err := w.GetProxyResponse()
	if err != nil {
		return GatewayTimeout(), NewLoggedError("error while generating proxy response: %v", err)
	}

	return res, nil
}
