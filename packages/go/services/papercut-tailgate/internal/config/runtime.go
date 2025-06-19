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
		rawUri, err := loadConfig(ctx, Global.appConfig.Profiles.PapercutServerTailnetUri)
		if err != nil {
			return err
		}

		mu.Lock()
		defer mu.Unlock()
		if cfg.Target, err = url.Parse(*rawUri); err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		authToken, err := loadConfig(ctx, Global.appConfig.Profiles.PapercutServerAuthToken)
		if err != nil {
			return err
		}

		mu.Lock()
		defer mu.Unlock()
		cfg.AuthToken = *authToken

		return nil
	})

	g.Go(func() error {
		client, err := unmarshalConfig[struct {
			Id     string `json:"id"`
			Secret string `json:"secret"`
		}](ctx, Global.appConfig.Profiles.TailscaleOAuthClient)
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

		if _, err = cfg.Tailscale.Server.Up(ctx); err != nil {
			return err
		}

		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func loadConfig(ctx context.Context, profile string) (*string, error) {
	data, err := fetchConfig(ctx, profile)
	if err != nil {
		return nil, err
	}

	config := string(data)

	return &config, nil
}

func unmarshalConfig[TConfig any](ctx context.Context, profile string) (*TConfig, error) {
	data, err := fetchConfig(ctx, profile)
	if err != nil {
		return nil, err
	}

	var config TConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

func fetchConfig(ctx context.Context, profile string) ([]byte, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		"GET",
		fmt.Sprintf(
			"http://localhost:%d/applications/%s/environments/%s/configurations/%s",
			Global.appConfigAgentPort,
			Global.appConfig.Application,
			Global.appConfig.Environment,
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
