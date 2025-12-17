package papercut

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"net/http/httputil"
	"strconv"
)

type MethodCall struct {
	XMLName    xml.Name `xml:"methodCall"`
	MethodName string   `xml:"methodName"`
	Params     Params   `xml:"params"`
}

type Params struct {
	Param []Param `xml:"param"`
}

type Param struct {
	Value Value `xml:"value"`
}

type Value struct {
	InnerXML string `xml:",innerxml"`
}

func InjectWebServicesAuthToken(req *httputil.ProxyRequest, authToken string) error {
	inBody, err := io.ReadAll(req.In.Body)
	if err != nil {
		return err
	}
	defer req.In.Body.Close()

	var methodCall MethodCall
	if err := xml.Unmarshal(inBody, &methodCall); err != nil {
		return err
	}

	methodCall.Params.Param = append(
		[]Param{
			{
				Value: Value{
					InnerXML: fmt.Sprintf("<string>%s</string>", authToken),
				},
			},
		},
		methodCall.Params.Param...,
	)

	outBody, err := xml.Marshal(methodCall)
	if err != nil {
		return err
	}

	contentLength := len(outBody)

	req.Out.Body = io.NopCloser(bytes.NewReader(outBody))
	req.Out.ContentLength = int64(contentLength)
	req.Out.Header.Set("Content-Length", strconv.Itoa(contentLength))

	return nil
}
