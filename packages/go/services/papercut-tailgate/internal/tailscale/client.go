package tailscale

import (
	"context"
	"errors"

	tsclient "github.com/tailscale/tailscale-client-go/v2"
)

type OAuthClient struct {
	Id     string
	Secret string
}

func (oauthClient *OAuthClient) NewClient() *tsclient.Client {
	return &tsclient.Client{
		Tailnet: "-",
		HTTP: tsclient.OAuthConfig{
			ClientID:     oauthClient.Id,
			ClientSecret: oauthClient.Secret,
			Scopes:       []string{"auth_keys"},
		}.HTTPClient(),
	}
}

func CreateAuthKey(ctx context.Context, client *tsclient.Client) (*tsclient.Key, error) {
	if client == nil {
		return nil, errors.New("missing tailscale client")
	}

	capabilities := tsclient.KeyCapabilities{}
	capabilities.Devices.Create.Reusable = false
	capabilities.Devices.Create.Ephemeral = true
	capabilities.Devices.Create.Preauthorized = true
	capabilities.Devices.Create.Tags = []string{"tag:printdesk"}

	key, err := client.Keys().Create(ctx, tsclient.CreateKeyRequest{
		Capabilities: capabilities,
		Description:  "PaperCut Tailscale Gateway",
	})
	if err != nil {
		return nil, err
	}

	return key, nil
}
