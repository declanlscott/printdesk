package lifecycle

import (
	"sync"
	"time"

	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	tsclient "github.com/tailscale/tailscale-client-go/v2"
	"tailscale.com/tailcfg"
	"tailscale.com/tsnet"
)

const (
	hostname       = "printworks"
	tsDir          = "/tmp/tailscale"
	cleanupTimeout = 1800 * time.Millisecond // Lambda shutdown phase is capped at 2 seconds
)

var (
	ts struct {
		client    *tsclient.Client
		authKeyID *string
		server    *tsnet.Server
		nodeID    *tailcfg.StableNodeID
	}
	HandlerAdapter *httpadapter.HandlerAdapter
	cleanupSync    struct {
		once sync.Once
		wg   sync.WaitGroup
	}
)
