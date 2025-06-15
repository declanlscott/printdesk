from typing import Optional

import pulumi
import pulumi_aws as aws
import pulumi_random as random

from sst import Resource
from utils import tags


class ConfigArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class ConfigProfiles:
    def __init__(
        self,
        papercut_server_tailnet_uri: pulumi.Input[aws.appconfig.ConfigurationProfile],
        papercut_server_auth_token: pulumi.Input[aws.appconfig.ConfigurationProfile],
        tailscale_oauth_client: pulumi.Input[aws.appconfig.ConfigurationProfile],
    ):
        self.papercut_server_tailnet_uri = papercut_server_tailnet_uri
        self.papercut_server_auth_token = papercut_server_auth_token
        self.tailscale_oauth_client = tailscale_oauth_client


class Config(pulumi.ComponentResource):
    def __init__(self, args: ConfigArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Config",
            name="Config",
            props=vars(args),
            opts=opts
        )

        self.__router_secret = random.RandomPassword(
            resource_name="RouterSecret",
            args=random.RandomPasswordArgs(
                length=32,
                special=True,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__sst_resource_router_secret_parameter = aws.ssm.Parameter(
            resource_name="SstResourceRouterSecretParameter",
            args=aws.ssm.ParameterArgs(
                name=f"/{Resource.AppData.name}/{Resource.AppData.stage}/{args.tenant_id}/router-secret",
                type=aws.ssm.ParameterType.SECURE_STRING,
                value=pulumi.Output.json_dumps(
                    {
                        "value": self.__router_secret.result,
                        "type": "random.index/randomPassword.RandomPassword"
                    }
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__application = aws.appconfig.Application(
            resource_name="Application",
            args=aws.appconfig.ApplicationArgs(
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=True,
            ),
        )

        self.__environment = aws.appconfig.Environment(
            resource_name="Environment",
            args=aws.appconfig.EnvironmentArgs(
                application=self.__application.id,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=True,
            ),
        )

        self.__papercut_server_tailnet_uri_profile = aws.appconfig.ConfigurationProfile(
            resource_name="PapercutServerTailnetUriProfile",
            args=aws.appconfig.ConfigurationProfileArgs(
                application_id=self.__application.id,
                location_uri="hosted",
                type="AWS.Freeform",
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=True,
            ),
        )

        self.__papercut_server_auth_token_profile = aws.appconfig.ConfigurationProfile(
            resource_name="PapercutServerAuthTokenProfile",
            args=aws.appconfig.ConfigurationProfileArgs(
                application_id=self.__application.id,
                location_uri="hosted",
                type="AWS.Freeform",
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=True,
            ),
        )

        self.__tailscale_oauth_client_profile = aws.appconfig.ConfigurationProfile(
            resource_name="TailscaleOauthClientProfile",
            args=aws.appconfig.ConfigurationProfileArgs(
                application_id=self.__application.id,
                location_uri="hosted",
                type="AWS.Freeform",
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=True,
            ),
        )

        self.register_outputs(
            {
                "router_secret": self.__router_secret.id,
                "sst_resource_router_secret_parameter": self.__sst_resource_router_secret_parameter.id,
                "application": self.__application.id,
                "environment": self.__environment.id,
                "papercut_server_tailnet_uri_profile": self.__papercut_server_tailnet_uri_profile.id,
                "papercut_server_auth_token_profile": self.__papercut_server_auth_token_profile.id,
                "tailscale_oauth_client_profile": self.__tailscale_oauth_client_profile.id,
            }
        )

    @property
    def router_secret(self):
        return self.__router_secret.result

    @property
    def sst_resource_router_secret_parameter(self):
        return self.__sst_resource_router_secret_parameter

    @property
    def application(self):
        return self.__application

    @property
    def environment(self):
        return self.__environment

    @property
    def profiles(self):
        return ConfigProfiles(
            papercut_server_tailnet_uri=self.__papercut_server_tailnet_uri_profile,
            papercut_server_auth_token=self.__papercut_server_auth_token_profile,
            tailscale_oauth_client=self.__tailscale_oauth_client_profile
        )
