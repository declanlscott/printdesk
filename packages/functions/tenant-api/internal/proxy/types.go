package proxy

import (
	"fmt"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
)

func NewLoggedError(format string, a ...interface{}) error {
	err := fmt.Errorf(format, a...)

	fmt.Println(err.Error())

	return err
}

func GatewayTimeout() events.APIGatewayV2HTTPResponse {
	return events.APIGatewayV2HTTPResponse{StatusCode: http.StatusGatewayTimeout}
}
