package lifecycle

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	tsclient "github.com/tailscale/tailscale-client-go/v2"
	"tailscale.com/tsnet"
)

func Startup() {
	log.Printf("Starting up ...")

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGTERM, syscall.SIGINT, syscall.SIGQUIT, syscall.SIGHUP)
	go cleanup(c)

	ctx := context.Background()

	log.Println("Getting startup parameters ...")
	params, err := getStartupParams(ctx)
	if err != nil {
		log.Fatalf("Failed to get startup parameters: %v", err)
	}

	_ = os.Setenv("TSNET_FORCE_LOGIN", "1")
	ts.server = &tsnet.Server{
		Dir:       tsDir,
		Hostname:  hostname,
		AuthKey:   *params.authKey,
		Ephemeral: true,
	}

	log.Println("Starting Tailscale server ...")
	status, err := ts.server.Up(ctx)
	if err != nil {
		log.Fatalf("Failed to start Tailscale server: %v", err)
	}
	ts.nodeID = &status.Self.ID

	proxy := httputil.NewSingleHostReverseProxy(params.target)
	proxy.Transport = ts.server.HTTPClient().Transport

	HandlerAdapter = httpadapter.New(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		}))

	log.Println("Startup completed")
}

type StartupParams struct {
	target  *url.URL
	authKey *string
}

func getStartupParams(ctx context.Context) (*StartupParams, error) {
	appName, ok := os.LookupEnv("APP_NAME")
	if !ok {
		log.Fatalf("APP_NAME environment variable not set")
	}
	appStage, ok := os.LookupEnv("APP_STAGE")
	if !ok {
		log.Fatalf("APP_STAGE environment variable not set")
	}
	tenantId, ok := os.LookupEnv("TENANT_ID")
	if !ok {
		log.Fatalf("TENANT_ID environment variable not set")
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("Failed to load AWS SDK configuration: %v", err)
	}

	client := ssm.NewFromConfig(cfg)

	const initialWgSize = 2
	var (
		target  *url.URL
		authKey *string

		wg   sync.WaitGroup
		errs = make(chan error, initialWgSize)
	)
	wg.Add(initialWgSize)

	go func() {
		defer wg.Done()

		output, err := client.GetParameter(ctx, &ssm.GetParameterInput{
			Name: aws.String(fmt.Sprintf("/%s/%s/tenant/%s/%s", appName, appStage, tenantId, targetParamName)),
		})
		if err != nil {
			errs <- fmt.Errorf("failed to get target parameter: %w", err)
			return
		}

		target, err = url.Parse(*output.Parameter.Value)
	}()

	go func() {
		defer wg.Done()

		output, err := client.GetParameter(ctx, &ssm.GetParameterInput{
			Name:           aws.String(fmt.Sprintf("/%s/%s/tenant/%s/%s", appName, appStage, tenantId, tsOAuthClientParamName)),
			WithDecryption: aws.Bool(true),
		})
		if err != nil {
			errs <- fmt.Errorf("failed to get oauth client parameter: %w", err)
			return
		}

		var oAuthClient struct {
			ID     string `json:"id"`
			Secret string `json:"secret"`
		}
		if err := json.Unmarshal([]byte(*output.Parameter.Value), &oAuthClient); err != nil {
			errs <- fmt.Errorf("failed to unmarshal oauth client parameter: %w", err)
			return
		}

		ts.client = &tsclient.Client{
			Tailnet: "-",
			HTTP: tsclient.OAuthConfig{
				ClientID:     oAuthClient.ID,
				ClientSecret: oAuthClient.Secret,
				Scopes:       []string{"auth_keys", "devices:core"},
			}.HTTPClient(),
		}

		capabilities := tsclient.KeyCapabilities{}
		capabilities.Devices.Create.Reusable = false
		capabilities.Devices.Create.Ephemeral = true
		capabilities.Devices.Create.Preauthorized = true
		capabilities.Devices.Create.Tags = []string{fmt.Sprintf("tag:%s", hostname)}

		key, err := ts.client.Keys().Create(ctx, tsclient.CreateKeyRequest{
			Capabilities:  capabilities,
			ExpirySeconds: 30 * 60, // 30 minutes
			Description:   "papercut secure reverse proxy",
		})
		if err != nil {
			errs <- fmt.Errorf("failed to create auth key: %w", err)
			return
		}

		authKey = &key.Key
		ts.authKeyID = &key.ID
	}()

	wg.Wait()
	close(errs)

	for err := range errs {
		if err != nil {
			return nil, err
		}
	}

	if target == nil || authKey == nil {
		return nil, errors.New("missing startup parameter(s)")
	}

	return &StartupParams{
		target:  target,
		authKey: authKey,
	}, nil
}
