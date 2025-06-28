package tailscale

import (
	"context"
	"os"

	"tailscale.com/tsnet"
)

func init() {
	if err := os.Setenv("TSNET_FORCE_LOGIN", "1"); err != nil {
		panic(err)
	}
}

type Server struct {
	*tsnet.Server
}

func (c *Client) NewServer(ctx context.Context) (*Server, error) {
	key, err := c.CreateAuthKey(ctx)
	if err != nil {
		return nil, err
	}

	hostname, err := os.Hostname()
	if err != nil {
		return nil, err
	}

	s := &Server{
		&tsnet.Server{
			Dir:       "/tmp/tailscale",
			Hostname:  hostname,
			AuthKey:   key.Key,
			Ephemeral: true,
		},
	}

	return s, nil
}
