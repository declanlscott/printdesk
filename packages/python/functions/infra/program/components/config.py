from typing import Optional

import pulumi
import pulumi_aws as aws
import pulumi_random as random
from sst import Resource

from utils import tags, is_prod_stage


class Parameters:
    def __init__(
        self,
        agent_access_token: pulumi.Input[aws.ssm.Parameter],
    ):
        self.agent_access_token = agent_access_token


class Static:
    def __init__(
        self,
        parameters: Parameters,
    ):
        self.parameters = parameters


class Profiles:
    def __init__(
        self,
        papercut_server_tailnet_uri: pulumi.Input[aws.appconfig.ConfigurationProfile],
        papercut_server_auth_token: pulumi.Input[aws.appconfig.ConfigurationProfile],
        tailscale_oauth_client: pulumi.Input[aws.appconfig.ConfigurationProfile],
    ):
        self.papercut_server_tailnet_uri = papercut_server_tailnet_uri
        self.papercut_server_auth_token = papercut_server_auth_token
        self.tailscale_oauth_client = tailscale_oauth_client


class Dynamic:
    def __init__(
        self,
        application: aws.appconfig.Application,
        environment: aws.appconfig.Environment,
        profiles: Profiles
    ):
        self.application = application
        self.environment = environment
        self.profiles = profiles


class ConfigArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Config(pulumi.ComponentResource):
    def __init__(self, args: ConfigArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Config",
            name="Config",
            props=vars(args),
            opts=opts
        )

        self.__agent_access_token = random.RandomPassword(
            resource_name="AgentAccessToken",
            args=random.RandomPasswordArgs(
                length=32,
                special=True,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__agent_access_token_parameter = aws.ssm.Parameter(
            resource_name="AgentAccessTokenParameter",
            args=aws.ssm.ParameterArgs(
                name=f"/{Resource.AppData.name}/{Resource.AppData.stage}/{args.tenant_id}/appconfig/agent-access-token",
                type=aws.ssm.ParameterType.SECURE_STRING,
                value=self.__agent_access_token.result,
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
                retain_on_delete=is_prod_stage,
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
                retain_on_delete=is_prod_stage,
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
                retain_on_delete=is_prod_stage,
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
                retain_on_delete=is_prod_stage,
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
                retain_on_delete=is_prod_stage,
            ),
        )

        self.register_outputs(
            {
                "agent_access_token": self.__agent_access_token.id,
                "agent_access_token_parameter": self.__agent_access_token_parameter.id,
                "application": self.__application.id,
                "environment": self.__environment.id,
                "papercut_server_tailnet_uri_profile": self.__papercut_server_tailnet_uri_profile.id,
                "papercut_server_auth_token_profile": self.__papercut_server_auth_token_profile.id,
                "tailscale_oauth_client_profile": self.__tailscale_oauth_client_profile.id,
            }
        )

    @property
    def static(self):
        return Static(
            parameters=Parameters(
                agent_access_token=self.__agent_access_token_parameter,
            )
        )

    @property
    def dynamic(self):
        return Dynamic(
            application=self.__application,
            environment=self.__environment,
            profiles=Profiles(
                papercut_server_tailnet_uri=self.__papercut_server_tailnet_uri_profile,
                papercut_server_auth_token=self.__papercut_server_auth_token_profile,
                tailscale_oauth_client=self.__tailscale_oauth_client_profile
            )
        )
