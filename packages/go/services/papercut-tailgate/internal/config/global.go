package config

import (
	"log"
	"strconv"

	"core/pkg/env"
	"core/pkg/resource"
)

var Global struct {
	Port               int
	appConfigAgentPort int
	appConfig          *appConfig
}

type appConfig struct {
	Application string `json:"application"`
	Environment string `json:"environment"`
	Profiles    struct {
		PapercutServerTailnetUri string `json:"papercut_server_tailnet_uri"`
		PapercutServerAuthToken  string `json:"papercut_server_auth_token"`
		TailscaleOAuthClient     string `json:"tailscale_oauth_client"`
	} `json:"profiles"`
}

func init() {
	var err error

	portStr, err := env.Get("PORT")
	if err != nil {
		log.Fatalf(err.Error())
	}
	Global.Port, err = strconv.Atoi(*portStr)
	if err != nil {
		log.Fatalf(err.Error())
	}

	appCfgAgtPortStr, err := env.Get("APPCONFIG_AGENT_PORT")
	if err != nil {
		log.Fatalf(err.Error())
	}
	Global.appConfigAgentPort, err = strconv.Atoi(*appCfgAgtPortStr)
	if err != nil {
		log.Fatalf(err.Error())
	}

	Global.appConfig, err = resource.Unmarshal[appConfig]("AppConfig")
	if err != nil {
		log.Fatalf(err.Error())
	}
}
