package proxy

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambdacontext"
)

const (
	// CustomHostVariable is the name of the environment variable that contains
	// the custom hostname for the request. If this variable is not set, the framework
	// reverts to `RequestContext.DomainName`. The value for a custom host should
	// include a protocol: http://my-custom.host.com
	CustomHostVariable = "GO_API_HOST"

	// APIGwContextHeader is the custom header key used to store the
	// API Gateway context. To access the Context properties use the
	// GetAPIGatewayContext method of the RequestAccessor object.
	APIGwContextHeader = "X-GoLambdaProxy-ApiGw-Context"

	// APIGwStageVarsHeader is the custom header key used to store the
	// API Gateway stage variables. To access the stage variable values
	// use the GetAPIGatewayStageVars method of the RequestAccessor object.
	APIGwStageVarsHeader = "X-GoLambdaProxy-ApiGw-StageVars"
)

type ctxKey struct{}

// RequestAccessor objects give access to custom API Gateway properties
// in the request.
type RequestAccessor struct {
	stripBasePath string
}

// GetAPIGatewayContext extracts the API Gateway context object from a
// request's custom header.
// Returns a populated events.APIGatewayProxyRequestContext object from
// the request.
func (r *RequestAccessor) GetAPIGatewayContext(req *http.Request) (events.APIGatewayV2HTTPRequestContext, error) {
	if req.Header.Get(APIGwContextHeader) == "" {
		return events.APIGatewayV2HTTPRequestContext{}, fmt.Errorf("no ctx header in request")
	}

	ctx := events.APIGatewayV2HTTPRequestContext{}

	if err := json.Unmarshal([]byte(req.Header.Get(APIGwContextHeader)), &ctx); err != nil {
		log.Println("error while unmarshalling ctx")
		log.Println(err)

		return events.APIGatewayV2HTTPRequestContext{}, err
	}

	return ctx, nil
}

// GetAPIGatewayStageVars extracts the API Gateway stage variables from a
// request's custom header.
// Returns a map[string]string of the stage variables and their values from
// the request.
func (r *RequestAccessor) GetAPIGatewayStageVars(req *http.Request) (map[string]string, error) {
	stageVars := make(map[string]string)

	if req.Header.Get(APIGwStageVarsHeader) == "" {
		return stageVars, fmt.Errorf("no stage vars header in request")
	}

	if err := json.Unmarshal([]byte(req.Header.Get(APIGwStageVarsHeader)), &stageVars); err != nil {
		log.Println("error while unmarshalling stage variables")
		log.Println(err)

		return stageVars, err
	}

	return stageVars, nil
}

// StripBasePath instructs the RequestAccessor object that the given base
// path should be removed from the request path before sending it to the
// framework for routing. This is used when API Gateway is configured with
// base path mappings in custom domain names.
func (r *RequestAccessor) StripBasePath(basePath string) string {
	if strings.Trim(basePath, " ") == "" {
		r.stripBasePath = ""

		return ""
	}

	newBasePath := basePath
	if !strings.HasPrefix(newBasePath, "/") {
		newBasePath = "/" + newBasePath
	}

	if strings.HasSuffix(newBasePath, "/") {
		newBasePath = newBasePath[:len(newBasePath)-1]
	}

	r.stripBasePath = newBasePath

	return newBasePath
}

// ProxyEventToHTTPRequest converts an API Gateway proxy event into an http.Request object.
// Returns the populated http request with additional two custom headers for the stage variables and API Gateway context.
// To access these properties, use the GetAPIGatewayStageVars and GetAPIGatewayContext method of the RequestAccessor object.
func (r *RequestAccessor) ProxyEventToHTTPRequest(req events.APIGatewayV2HTTPRequest) (*http.Request, error) {
	httpRequest, err := r.EventToRequest(req)
	if err != nil {
		log.Println(err)

		return nil, err
	}

	return addToHeader(httpRequest, req)
}

// EventToRequestWithContext converts an API Gateway proxy event and context into an http.Request object.
// Returns the populated http request with lambda context, stage variables, and APIGatewayProxyRequestContext as part of its context.
// Access those using GetAPIGatewayContextFromContext, GetStageVarsFromContext and GetRuntimeContextFromContext functions in this package.
func (r *RequestAccessor) EventToRequestWithContext(ctx context.Context, req events.APIGatewayV2HTTPRequest) (*http.Request, error) {
	httpRequest, err := r.EventToRequest(req)
	if err != nil {
		log.Println(err)

		return nil, err
	}

	return addToContext(ctx, httpRequest, req), nil
}

// EventToRequest converts an API Gateway proxy event into an http.Request object.
// Returns the populated request maintaining headers
func (r *RequestAccessor) EventToRequest(req events.APIGatewayV2HTTPRequest) (*http.Request, error) {
	decodedBody := []byte(req.Body)
	if req.IsBase64Encoded {
		base64Body, err := base64.StdEncoding.DecodeString(req.Body)
		if err != nil {
			return nil, err
		}

		decodedBody = base64Body
	}

	path := req.RawPath

	// if RawPath is empty, populate from request context
	if len(path) == 0 {
		path = req.RequestContext.HTTP.Path
	}

	if r.stripBasePath != "" && len(r.stripBasePath) > 1 {
		if strings.HasPrefix(path, r.stripBasePath) {
			path = strings.Replace(path, r.stripBasePath, "", 1)
		}
	}

	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	serverAddress := "https://" + req.RequestContext.DomainName

	if customAddress, ok := os.LookupEnv(CustomHostVariable); ok {
		serverAddress = customAddress
	}

	path = serverAddress + path

	if len(req.RawQueryString) > 0 {
		path += "?" + req.RawQueryString
	} else if len(req.QueryStringParameters) > 0 {
		values := url.Values{}

		for key, value := range req.QueryStringParameters {
			values.Add(key, value)
		}

		path += "?" + values.Encode()
	}

	httpRequest, err := http.NewRequest(
		strings.ToUpper(req.RequestContext.HTTP.Method),
		path,
		bytes.NewReader(decodedBody),
	)

	if err != nil {
		fmt.Printf("could not convert request %s:%s to http.Request\n", req.RequestContext.HTTP.Method, req.RequestContext.HTTP.Path)
		log.Println(err)

		return nil, err
	}

	httpRequest.RemoteAddr = req.RequestContext.HTTP.SourceIP

	for _, cookie := range req.Cookies {
		httpRequest.Header.Add("Cookie", cookie)
	}

	singletonHeaders, headers := splitSingletonHeaders(req.Headers)

	for headerKey, headerValue := range singletonHeaders {
		httpRequest.Header.Add(headerKey, headerValue)
	}

	for headerKey, headerValue := range headers {
		for _, val := range strings.Split(headerValue, ",") {
			httpRequest.Header.Add(headerKey, strings.Trim(val, " "))
		}
	}

	httpRequest.RequestURI = httpRequest.URL.RequestURI()

	return httpRequest, nil
}

func addToHeader(req *http.Request, apiGwRequest events.APIGatewayV2HTTPRequest) (*http.Request, error) {
	stageVars, err := json.Marshal(apiGwRequest.StageVariables)
	if err != nil {
		log.Println("could not marshal stage variables for custom header")

		return nil, err
	}
	req.Header.Add(APIGwStageVarsHeader, string(stageVars))

	apiGwContext, err := json.Marshal(apiGwRequest.RequestContext)
	if err != nil {
		log.Println("could not Marshal API GW context for custom header")

		return req, err
	}
	req.Header.Add(APIGwContextHeader, string(apiGwContext))

	return req, nil
}

func addToContext(ctx context.Context, req *http.Request, apiGwRequest events.APIGatewayV2HTTPRequest) *http.Request {
	lc, _ := lambdacontext.FromContext(ctx)
	rc := requestContext{lambdaContext: lc, gatewayProxyContext: apiGwRequest.RequestContext, stageVars: apiGwRequest.StageVariables}
	ctx = context.WithValue(ctx, ctxKey{}, rc)

	return req.WithContext(ctx)
}

// GetAPIGatewayContextFromContext retrieve APIGatewayProxyRequestContext from context.Context
func GetAPIGatewayContextFromContext(ctx context.Context) (events.APIGatewayV2HTTPRequestContext, bool) {
	v, ok := ctx.Value(ctxKey{}).(requestContext)

	return v.gatewayProxyContext, ok
}

// GetRuntimeContextFromContext retrieve Lambda Runtime Context from context.Context
func GetRuntimeContextFromContext(ctx context.Context) (*lambdacontext.LambdaContext, bool) {
	v, ok := ctx.Value(ctxKey{}).(requestContext)

	return v.lambdaContext, ok
}

// GetStageVarsFromContext retrieve stage variables from context
func GetStageVarsFromContext(ctx context.Context) (map[string]string, bool) {
	v, ok := ctx.Value(ctxKey{}).(requestContext)

	return v.stageVars, ok
}

type requestContext struct {
	lambdaContext       *lambdacontext.LambdaContext
	gatewayProxyContext events.APIGatewayV2HTTPRequestContext
	stageVars           map[string]string
}

// splitSingletonHeaders splits the headers into single-value headers and other,
// multi-value capable, headers.
// Returns (single-value headers, multi-value-capable headers)
func splitSingletonHeaders(headers map[string]string) (map[string]string, map[string]string) {
	singletons := make(map[string]string)
	multitons := make(map[string]string)
	for headerKey, headerValue := range headers {
		if ok := singletonHeaders[textproto.CanonicalMIMEHeaderKey(headerKey)]; ok {
			singletons[headerKey] = headerValue
		} else {
			multitons[headerKey] = headerValue
		}
	}

	return singletons, multitons
}

// singletonHeaders is a set of headers, that only accept a single
// value which may be comma separated (according to RFC 7230)
var singletonHeaders = map[string]bool{
	"Content-Type":        true,
	"Content-Disposition": true,
	"Content-Length":      true,
	"User-Agent":          true,
	"Referer":             true,
	"Host":                true,
	"Authorization":       true,
	"Proxy-Authorization": true,
	"If-Modified-Since":   true,
	"If-Unmodified-Since": true,
	"From":                true,
	"Location":            true,
	"Max-Forwards":        true,
}
