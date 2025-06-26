package config

import (
	"log"
	"strconv"

	"core/pkg/env"
	"core/pkg/resource"
)

var Global struct {
	Port        int
	HeaderNames *headerNames
	appConfig   *appConfig
}

type appConfig struct {
	Application string `json:"application"`
	Environment string `json:"environment"`
	Profiles    struct {
		PapercutServerTailnetUri string `json:"papercut_server_tailnet_uri"`
		PapercutServerAuthToken  string `json:"papercut_server_auth_token"`
		TailscaleOAuthClient     string `json:"tailscale_oauth_client"`
	} `json:"profiles"`
	agentPort int
}

type headerNames struct {
	SetPapercutAuth string
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

	setPapercutAuthHeaderName, err := resource.Get("Headers", "names", "SET_PAPERCUT_AUTH")
	if err != nil {
		log.Fatalf(err.Error())
	}
	Global.HeaderNames = &headerNames{
		SetPapercutAuth: setPapercutAuthHeaderName.(string),
	}

	Global.appConfig, err = resource.Unmarshal[appConfig]("AppConfig")
	if err != nil {
		log.Fatalf(err.Error())
	}

	appCfgAgtPortStr, err := env.Get("APPCONFIG_AGENT_PORT")
	if err != nil {
		log.Fatalf(err.Error())
	}
	Global.appConfig.agentPort, err = strconv.Atoi(*appCfgAgtPortStr)
	if err != nil {
		log.Fatalf(err.Error())
	}
}
