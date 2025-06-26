package config

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"

	tsclient "github.com/tailscale/tailscale-client-go/v2"
	"golang.org/x/sync/errgroup"
	"tailscale.com/tsnet"

	"core/pkg/resource"

	"papercut-tailgate/internal/tailscale"
)

type RuntimeConfig struct {
	AuthToken string
	Tailscale struct {
		OAuth  *tsclient.OAuthConfig
		Server *tsnet.Server
	}
	Target *url.URL
}

func Load(ctx context.Context) (*RuntimeConfig, error) {
	var (
		mu  sync.Mutex
		cfg RuntimeConfig
	)

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		profile, err := resource.Get[string]("AppConfig", "profiles", "papercutServerTailnetUri")
		if err != nil {
			return err
		}

		rawUri, err := load(ctx, profile)
		if err != nil {
			return err
		}

		mu.Lock()
		defer mu.Unlock()
		if cfg.Target, err = url.Parse(rawUri); err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		profile, err := resource.Get[string]("AppConfig", "profiles", "papercutServerAuthToken")
		if err != nil {
			return err
		}

		authToken, err := load(ctx, profile)
		if err != nil {
			return err
		}

		mu.Lock()
		defer mu.Unlock()
		cfg.AuthToken = authToken

		return nil
	})

	g.Go(func() error {
		profile, err := resource.Get[string]("AppConfig", "profiles", "tailscaleOauthClient")
		if err != nil {
			return err
		}

		client, err := unmarshal[struct {
			Id     string `json:"id"`
			Secret string `json:"secret"`
		}](ctx, profile)
		if err != nil {
			return err
		}

		mu.Lock()
		defer mu.Unlock()
		cfg.Tailscale.OAuth = &tsclient.OAuthConfig{
			ClientID:     client.Id,
			ClientSecret: client.Secret,
		}

		if cfg.Tailscale.Server, err = tailscale.NewServer(ctx, cfg.Tailscale.OAuth); err != nil {
			return err
		}

		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func load(ctx context.Context, profile string) (string, error) {
	data, err := fetch(ctx, profile)
	if err != nil {
		return "", err
	}

	config := string(data)

	return config, nil
}

func unmarshal[TConfig any](ctx context.Context, profile string) (*TConfig, error) {
	data, err := fetch(ctx, profile)
	if err != nil {
		return nil, err
	}

	var config TConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

func fetch(ctx context.Context, profile string) ([]byte, error) {
	port, err := resource.Get[int]("AppConfig", "agentPort")
	if err != nil {
		return nil, err
	}

	app, err := resource.Get[string]("AppConfig", "application")
	if err != nil {
		return nil, err
	}

	env, err := resource.Get[string]("AppConfig", "environment")
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		"GET",
		fmt.Sprintf(
			"http://localhost:%d/applications/%s/environments/%s/configurations/%s",
			port,
			app,
			env,
			profile,
		),
		nil,
	)
	if err != nil {
		return nil, err
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error fetching config profile %s: %d", profile, res.StatusCode)
	}

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (cfg *RuntimeConfig) HasChanged(newCfg *RuntimeConfig) bool {
	if cfg.AuthToken != newCfg.AuthToken {
		return true
	}

	if cfg.Tailscale.OAuth.ClientID != newCfg.Tailscale.OAuth.ClientID ||
		cfg.Tailscale.OAuth.ClientSecret != newCfg.Tailscale.OAuth.ClientSecret {
		return true
	}

	if cfg.Target.String() != newCfg.Target.String() {
		return true
	}

	return false
}
