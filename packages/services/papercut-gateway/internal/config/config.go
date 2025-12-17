package config

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"

	"golang.org/x/oauth2/clientcredentials"
	"golang.org/x/sync/errgroup"

	"core/pkg/sst"
)

type Config struct {
	TailscaleClientCredentials     *clientcredentials.Config
	PapercutTailscaleServiceTarget *url.URL
	PapercutWebServicesAuthToken   string
}

const agtTokenKey = "agent-token"

func Load(ctx context.Context, agtToken string) (*Config, error) {
	var (
		mu  sync.Mutex
		cfg Config
	)

	g, ctx := errgroup.WithContext(context.WithValue(ctx, agtTokenKey, agtToken))

	g.Go(func() error {
		profile, err := sst.Resource[string]("AppConfig", "profiles", "tailscaleOauthClient")
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
		cfg.TailscaleClientCredentials = &clientcredentials.Config{
			ClientID:     client.Id,
			ClientSecret: client.Secret,
		}

		g.Go(func() error {
			profile, err := sst.Resource[string]("AppConfig", "profiles", "papercutTailscaleService")
			if err != nil {
				return err
			}

			service, err := unmarshal[struct {
				Domain string `json:"domain"`
				Path   string `json:"path"`
			}](ctx, profile)
			if err != nil {
				return err
			}

			mu.Lock()
			defer mu.Unlock()
			if cfg.PapercutTailscaleServiceTarget, err = url.Parse(fmt.Sprintf("https://%s%s", service.Domain, service.Path)); err != nil {
				return err
			}

			return nil
		})

		g.Go(func() error {
			profile, err := sst.Resource[string]("AppConfig", "profiles", "papercutWebServicesAuthToken")
			if err != nil {
				return err
			}

			authToken, err := load(ctx, profile)
			if err != nil {
				return err
			}

			mu.Lock()
			defer mu.Unlock()
			cfg.PapercutWebServicesAuthToken = authToken

			return nil
		})

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
	port, err := sst.Resource[int]("AppConfig", "agentPort")
	if err != nil {
		return nil, err
	}

	token, ok := ctx.Value(agtTokenKey).(string)
	if !ok || token == "" {
		return nil, fmt.Errorf("agent access token missing from context")
	}

	app, err := sst.Resource[string]("AppConfig", "application")
	if err != nil {
		return nil, err
	}

	env, err := sst.Resource[string]("AppConfig", "environment")
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

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

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
