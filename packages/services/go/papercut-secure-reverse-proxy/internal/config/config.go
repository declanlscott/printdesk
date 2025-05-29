package config

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/sst/sst/v3/sdk/golang/resource"

	"papercut-secure-reverse-proxy/internal/tailscale"
)

type Config struct {
	Proxy     *ProxyConfig
	Tailscale *TailscaleConfig
}

type ProxyConfig struct {
	Target *Target
	Port   int
}

type Target struct {
	URL *url.URL
}

type TailscaleConfig struct {
	OAuthClient *tailscale.OAuthClient
}

func Load(ctx context.Context) (*Config, error) {
	tenantId, ok := os.LookupEnv("TENANT_ID")
	if !ok {
		return nil, errors.New("missing TENANT_ID environment variable")
	}

	portStr, ok := os.LookupEnv("PORT")
	if !ok {
		return nil, errors.New("missing PORT environment variable")
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, err
	}

	b64Key, ok := os.LookupEnv("CONFIG_KEY")
	if !ok {
		return nil, errors.New("missing CONFIG_KEY environment variable")
	}
	key, err := base64.StdEncoding.DecodeString(b64Key)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aesGcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	configTableName, err := resource.Get("ConfigTable", "name")
	if err != nil {
		return nil, err
	}

	awsCfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	ddb := dynamodb.NewFromConfig(awsCfg)

	pk, err := attributevalue.MarshalMap(map[string]string{
		"PK": fmt.Sprintf("tenant#%s", tenantId),
	})
	if err != nil {
		return nil, err
	}

	output, err := ddb.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(configTableName.(string)),
		Key:       pk,
		ProjectionExpression: aws.String(
			"iv, tag, papercut_server_tailnet_uri, tailscale_oauth_client_id, tailscale_oauth_client_secret",
		),
	})
	if err != nil {
		return nil, err
	}

	var item struct {
		Iv                         []byte `dynamodbav:"iv"`
		Tag                        []byte `dynamodbav:"tag"`
		PapercutServerTailnetUri   []byte `dynamodbav:"papercut_server_tailnet_uri"`
		TailscaleOauthClientId     []byte `dynamodbav:"tailscale_oauth_client_id"`
		TailscaleOauthClientSecret []byte `dynamodbav:"tailscale_oauth_client_secret"`
	}
	if err := attributevalue.UnmarshalMap(output.Item, &item); err != nil {
		return nil, err
	}

	target, err := aesGcm.Open(
		nil,
		item.Iv,
		append(item.PapercutServerTailnetUri, item.Tag...),
		nil,
	)
	if err != nil {
		return nil, err
	}

	targetUrl, err := url.Parse(string(target))
	if err != nil {
		return nil, err
	}

	clientId, err := aesGcm.Open(
		nil,
		item.Iv,
		append(item.TailscaleOauthClientId, item.Tag...),
		nil,
	)
	if err != nil {
		return nil, err
	}

	clientSecret, err := aesGcm.Open(
		nil,
		item.Iv,
		append(item.TailscaleOauthClientSecret, item.Tag...),
		nil,
	)
	if err != nil {
		return nil, err
	}

	return &Config{
		Proxy: &ProxyConfig{
			Target: &Target{
				URL: targetUrl,
			},
			Port: port,
		},
		Tailscale: &TailscaleConfig{
			OAuthClient: &tailscale.OAuthClient{
				Id:     string(clientId),
				Secret: string(clientSecret),
			},
		},
	}, nil
}
