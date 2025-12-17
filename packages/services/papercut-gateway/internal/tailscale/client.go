package tailscale

import (
	"context"

	tsclient "github.com/tailscale/tailscale-client-go/v2"
	"golang.org/x/oauth2/clientcredentials"
)

type Client struct {
	*tsclient.Client
}

func NewClient(cfg *clientcredentials.Config) *Client {
	return &Client{
		&tsclient.Client{
			Tailnet: "-",
			HTTP: tsclient.OAuthConfig{
				ClientID:     cfg.ClientID,
				ClientSecret: cfg.ClientSecret,
			}.HTTPClient(),
			UserAgent: "papercut-gateway",
		},
	}
}

func (c *Client) CreateAuthKey(ctx context.Context) (*tsclient.Key, error) {
	capabilities := tsclient.KeyCapabilities{}
	capabilities.Devices.Create.Reusable = false
	capabilities.Devices.Create.Ephemeral = true
	capabilities.Devices.Create.Preauthorized = true
	capabilities.Devices.Create.Tags = []string{"tag:printdesk"}

	key, err := c.Keys().Create(ctx, tsclient.CreateKeyRequest{
		Capabilities: capabilities,
		Description:  "PaperCut Gateway",
	})
	if err != nil {
		return nil, err
	}

	return key, nil
}
