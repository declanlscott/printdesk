package config

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"papercut-tailgate/internal/tailscale"
	"sync"

	tsclient "github.com/tailscale/tailscale-client-go/v2"
	"tailscale.com/tsnet"
)

type Dynamic struct {
	Target    *url.URL
	Tailscale struct {
		OAuth  *tsclient.OAuthConfig
		Server *tsnet.Server
	}
	AuthToken string
}

type tailscaleOAuthClient struct {
	Id     string `json:"id"`
	Secret string `json:"secret"`
}

type profileResult[TProfile any] struct {
	Name    string
	Profile TProfile
	Error   error
}

func Load(ctx context.Context) (*Dynamic, error) {
	var cfg Dynamic
	var wg sync.WaitGroup
	var err error

	wg.Add(1)
	papercutServerTailnetUriCh := make(chan profileResult[string], 1)
	go loadProfile(ctx, &wg, papercutServerTailnetUriCh, Static.AppConfig.Profiles.PapercutServerTailnetUri)

	wg.Add(1)
	papercutServerAuthTokenCh := make(chan profileResult[string], 1)
	go loadProfile(ctx, &wg, papercutServerAuthTokenCh, Static.AppConfig.Profiles.PapercutServerAuthToken)

	wg.Add(1)
	tailscaleOAuthClientCh := make(chan profileResult[tailscaleOAuthClient], 1)
	go unmarshalProfile(ctx, &wg, tailscaleOAuthClientCh, Static.AppConfig.Profiles.TailscaleOAuthClient)

	wg.Wait()
	papercutServerTailnetUriResult := <-papercutServerTailnetUriCh
	papercutAuthTokenResult := <-papercutServerAuthTokenCh
	tailscaleOAuthClientResult := <-tailscaleOAuthClientCh

	if papercutServerTailnetUriResult.Error != nil {
		return nil, papercutServerTailnetUriResult.Error
	}
	if cfg.Target, err = url.Parse(papercutServerTailnetUriResult.Profile); err != nil {
		return nil, err
	}

	if papercutAuthTokenResult.Error != nil {
		return nil, papercutAuthTokenResult.Error
	}
	cfg.AuthToken = papercutAuthTokenResult.Profile

	if tailscaleOAuthClientResult.Error != nil {
		return nil, tailscaleOAuthClientResult.Error
	}
	cfg.Tailscale.OAuth = &tsclient.OAuthConfig{
		ClientID:     tailscaleOAuthClientResult.Profile.Id,
		ClientSecret: tailscaleOAuthClientResult.Profile.Secret,
	}

	cfg.Tailscale.Server, err = tailscale.NewServer(ctx, cfg.Tailscale.OAuth)
	if err != nil {
		return nil, err
	}

	if _, err = cfg.Tailscale.Server.Up(ctx); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func loadProfile(
	ctx context.Context,
	wg *sync.WaitGroup,
	ch chan profileResult[string],
	name string,
) {
	defer wg.Done()

	data, err := fetchProfile(ctx, name)
	if err != nil {
		ch <- profileResult[string]{
			Name:  name,
			Error: err,
		}
		return
	}

	ch <- profileResult[string]{
		Name:    name,
		Profile: string(data),
	}
}

func unmarshalProfile[TProfile any](
	ctx context.Context,
	wg *sync.WaitGroup,
	ch chan profileResult[TProfile],
	name string,
) {
	defer wg.Done()

	data, err := fetchProfile(ctx, name)
	if err != nil {
		ch <- profileResult[TProfile]{
			Name:  name,
			Error: err,
		}
		return
	}

	var profile TProfile
	if err := json.Unmarshal(data, &profile); err != nil {
		ch <- profileResult[TProfile]{
			Name:  name,
			Error: err,
		}
		return
	}

	ch <- profileResult[TProfile]{
		Name:    name,
		Profile: profile,
	}
}

func fetchProfile(ctx context.Context, name string) ([]byte, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		"GET",
		fmt.Sprintf(
			"http://localhost:%d/applications/%s/environments/%s/configurations/%s",
			Static.AppConfigAgentPort,
			Static.AppConfig.Application,
			Static.AppConfig.Environment,
			name,
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
		return nil, fmt.Errorf("error fetching profile %s: %d", name, res.StatusCode)
	}

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	return data, nil
}
