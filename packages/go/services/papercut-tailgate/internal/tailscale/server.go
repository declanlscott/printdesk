package tailscale

import (
	"context"
	"errors"
	"os"

	"tailscale.com/tsnet"
)

type Server struct {
	*tsnet.Server
}

func (c *Client) NewServer(ctx context.Context) (*Server, error) {
	if c == nil {
		return nil, errors.New("nil tailscale c")
	}

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
