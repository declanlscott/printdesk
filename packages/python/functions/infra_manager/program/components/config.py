from dataclasses import dataclass
from typing import Optional

import pulumi
import pulumi_aws as aws
from sst import Resource

from utils import naming


@dataclass
class ConfigArgs:
    tenant_id: pulumi.Input[str]


class Config:
    def __init__(self, args: ConfigArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:aws:Config",
            name="Config",
            props=vars(args),
            opts=opts,
        )

        self._papercut_api_auth_token_configuration_profile = aws.appconfig.ConfigurationProfile(
            resource_name="ConfigPapercutApiAuthTokenConfigurationProfile",
            args=aws.appconfig.ConfigurationProfileArgs(
                application_id=Resource.AppconfigApplication.id,
                type="AWS.Freeform",
                location_uri="hosted",
                name=pulumi.Output.from_input(args.tenant_id).apply(
                    lambda tenant_id: naming.template(
                        name_template=Resource.PapercutApiAuthTokenConfigurationProfileTemplate.name,
                        tenant_id=tenant_id,
                    )
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._papercut_api_gateway_client_credentials_configuration_profile = aws.appconfig.ConfigurationProfile(
            resource_name="ConfigPapercutApiGatewayClientCredentialsConfigurationProfile",
            args=aws.appconfig.ConfigurationProfileArgs(
                application_id=Resource.AppconfigApplication.id,
                type="AWS.Freeform",
                location_uri="hosted",
                name=pulumi.Output.from_input(args.tenant_id).apply(
                    lambda tenant_id: naming.template(
                        name_template=Resource.PapercutApiGatewayClientCredentialsConfigurationProfileTemplate.name,
                        tenant_id=tenant_id,
                    )
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._appconfig_role = aws.iam.Role(
            resource_name="ConfigAppconfigRole",
            args=aws.iam.RoleArgs(
                name=pulumi.Output.from_input(args.tenant_id).apply(
                    lambda tenant_id: naming.template(
                        name_template=Resource.AppconfigRoleTemplate.name,
                        tenant_id=tenant_id,
                    )
                ),
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS", identifiers=[Resource.Api.roleArn]
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).json,
                inline_policies=[
                    aws.iam.RoleInlinePolicyArgs(
                        policy=aws.iam.get_policy_document_output(
                            statements=pulumi.Output.all(
                                papercut_api_auth_token_configuration_profile=self._papercut_api_auth_token_configuration_profile.arn,
                                papercut_api_gateway_client_credentials_configuration_profile=self._papercut_api_gateway_client_credentials_configuration_profile.arn,
                            ).apply(
                                lambda arns: [
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=[
                                            "appconfig:CreateHostedConfigurationVersion"
                                        ],
                                        resources=[
                                            Resource.AppconfigApplication.arn,
                                            arns[
                                                "papercut_api_auth_token_configuration_profile"
                                            ],
                                            arns[
                                                "papercut_api_gateway_client_credentials_configuration_profile"
                                            ],
                                        ],
                                    ),
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appconfig:StartDeployment"],
                                        resources=[
                                            Resource.AppconfigApplication.arn,
                                            Resource.AppconfigEnvironment.arn,
                                            arns[
                                                "papercut_api_auth_token_configuration_profile"
                                            ],
                                            arns[
                                                "papercut_api_gateway_client_credentials_configuration_profile"
                                            ],
                                            Resource.PapercutApiAuthTokenDeploymentStrategy.arn,
                                            Resource.PapercutApiGatewayClientCredentialsDeploymentStrategy.arn,
                                        ],
                                    ),
                                ]
                            )
                        ).json
                    )
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )
