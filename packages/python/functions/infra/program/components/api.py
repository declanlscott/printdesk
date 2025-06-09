import json
from typing import Optional

import pulumi
import pulumi_aws as aws
from sst import Resource

from utils import tags, naming


class ApiArgs:
    def __init__(
            self,
            router_secret: pulumi.Input[str],
            tenant_id: str
        ):
        self.router_secret = router_secret
        self.tenant_id = tenant_id


class Api(pulumi.ComponentResource):
    def __init__(
        self, args: ApiArgs, opts: Optional[pulumi.ResourceOptions] = None
    ):
        super().__init__(
            t="pd:resource:Api",
            name="Api",
            props=vars(args),
            opts=opts
        )

        self.__api = aws.apigatewayv2.Api(
            resource_name="Api",
            args=aws.apigatewayv2.ApiArgs(
                name=naming.physical(128, "Api", args.tenant_id),
                protocol_type="HTTP",
                cors_configuration=aws.apigatewayv2.ApiCorsConfigurationArgs(
                    allow_headers=["*"],
                    allow_methods=["*"],
                    allow_origins=["*"],
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__log_group = aws.cloudwatch.LogGroup(
            resource_name="AccessLog",
            args=aws.cloudwatch.LogGroupArgs(
                name=pulumi.Output.format(
                    "/aws/vendedlogs/apis/{0}",
                    self.__api.name,
                ),
                retention_in_days=30,
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__stage = aws.apigatewayv2.Stage(
            resource_name="Stage",
            args=aws.apigatewayv2.StageArgs(
                api_id=self.__api.id,
                auto_deploy=True,
                name="$default",
                access_log_settings=aws.apigatewayv2.StageAccessLogSettingsArgs(
                    destination_arn=self.__log_group.arn,
                    format=json.dumps(
                        {
                            # request info
                            "requestTime": "$context.requestTime",
                            "requestId": "$context.requestId",
                            "httpMethod": "$context.httpMethod",
                            "path": "$context.path",
                            "routeKey": "$context.routeKey",
                            "status": "$context.status",
                            "responseLatency": "$context.responseLatency",
                            # integration info
                            "integrationRequestId": "$context.integration.requestId",
                            "integrationStatus": "$context.integration.status",
                            "integrationLatency": "$context.integration.latency",
                            "integrationServiceStatus": "$context.integration.integrationStatus",
                            # caller info
                            "ip": "$context.identity.sourceIp",
                            "userAgent": "$context.identity.userAgent",
                        }
                    )
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__api_function = aws.lambda_.Function(
            resource_name="ApiFunction",
            args=aws.lambda_.FunctionArgs(
                package_type="Image",
                image_uri=Resource.TenantApiFunctionImage.uri,
                role="TODO",
                timeout=20,
                architectures=["arm64"],
                logging_config=aws.lambda_.FunctionLoggingConfigArgs(
                    log_format="Text",
                    log_group="TODO",
                ),
                environment=aws.lambda_.FunctionEnvironmentArgs(
                    variables={
                        "TENANT_ID": args.tenant_id,
                        "SST_KEY": Resource.TenantApiFunctionResourceCiphertext.encryptionKey,
                        "SST_RESOURCE_RouterSecret": json.dumps(
                            {
                                "value": args.router_secret,
                                "type": "random.index/randomPassword.RandomPassword"
                            }
                        ),
                    }
                )
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.register_outputs(
            {
                "api": self.__api.id,
                "log_group": self.__log_group.id,
                "stage": self.__stage.id,
                "api_function": self.__api_function.id,
            }
        )
