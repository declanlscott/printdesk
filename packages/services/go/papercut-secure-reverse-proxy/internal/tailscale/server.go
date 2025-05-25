package tailscale

import (
	"os"

	"tailscale.com/tsnet"
)

func NewServer(authKey string) (*tsnet.Server, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return nil, err
	}

	return &tsnet.Server{
		Dir:       "/tmp/tailscale",
		Hostname:  hostname,
		AuthKey:   authKey,
		Ephemeral: true,
	}, nil
}
