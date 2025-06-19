package tailscale

import (
	"context"
	"os"

	tsclient "github.com/tailscale/tailscale-client-go/v2"
	"tailscale.com/tsnet"
)

func NewServer(ctx context.Context, ocfg *tsclient.OAuthConfig) (*tsnet.Server, error) {
	tsc := NewClient(ocfg)

	key, err := CreateAuthKey(ctx, tsc)
	if err != nil {
		return nil, err
	}

	hostname, err := os.Hostname()
	if err != nil {
		return nil, err
	}

	srv := &tsnet.Server{
		Dir:       "/tmp/tailscale",
		Hostname:  hostname,
		AuthKey:   key.Key,
		Ephemeral: true,
	}

	return srv, nil
}
