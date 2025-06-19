import json
from typing import Optional

import pulumi
import pulumi_aws as aws
from sst import Resource

from .config import Static, Dynamic
from .physical_name import PhysicalName, PhysicalNameArgs
from utils import tags, naming


class ApiArgs:
    def __init__(
            self,
            tenant_id: str,
            static_config: pulumi.Input[Static],
            dynamic_config: pulumi.Input[Dynamic],
        ):
        self.tenant_id = tenant_id
        self.static_config = static_config
        self.dynamic_config = dynamic_config


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
                tags=tags(args.tenant_id),
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
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__api_function_name = PhysicalName(
            name="ApiFunction",
            args=PhysicalNameArgs(max_=64),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__api_function_log_group = aws.cloudwatch.LogGroup(
            resource_name="ApiFunctionLogGroup",
            args=aws.cloudwatch.LogGroupArgs(
                name=pulumi.Output.format("/aws/lambda/{0}", self.__api_function_name.result),
                retention_in_days=30,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__api_function = aws.lambda_.Function(
            resource_name="ApiFunction",
            args=aws.lambda_.FunctionArgs(
                name=self.__api_function_name.result,
                package_type="Image",
                image_uri=Resource.TenantApiFunctionImage.uri,
                role=Resource.TenantApiFunctionRole.arn,
                timeout=20,
                architectures=["arm64"],
                logging_config=aws.lambda_.FunctionLoggingConfigArgs(
                    log_format="Text",
                    log_group=self.__api_function_log_group.name,
                ),
                environment=aws.lambda_.FunctionEnvironmentArgs(
                    variables={
                        "TENANT_ID": args.tenant_id,
                        "SST_KEY": Resource.TenantApiFunctionResourceCiphertext.encryptionKey,
                        "SST_RESOURCE_RouterSecret": args.static_config.parameters.router_secret_sst_resource.value,
                    }
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__api_function_permission = aws.lambda_.Permission(
            resource_name="ApiFunctionPermission",
            args=aws.lambda_.PermissionArgs(
                action="lambda:InvokeFunction",
                function=self.__api_function.arn,
                principal="apigateway.amazonaws.com",
                source_arn=pulumi.Output.format("{0}/*", self.__api.execution_arn),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__api_function_integration = aws.apigatewayv2.Integration(
            resource_name="ApiFunctionIntegration",
            args=aws.apigatewayv2.IntegrationArgs(
                api_id=self.__api.id,
                integration_type="AWS_PROXY",
                integration_uri=self.__api_function.arn,
                payload_format_version="2.0",
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                depends_on=[self.__api_function_permission],
            )
        )

        self.__api_function_route = aws.apigatewayv2.Route(
            resrouce_name="ApiFunctionRoute",
            args=aws.apigatewayv2.RouteArgs(
                api_id=self.__api.id,
                route_key="$default",
                target=pulumi.Output.format(
                    "integrations/{0}",
                    self.__api_function_integration.id,
                ),
                authorization_type="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__papercut_tailgate_log_group = aws.cloudwatch.LogGroup(
            resource_name="PapercutTailgateLogGroup",
            args=aws.cloudwatch.LogGroupArgs(
                name=f"/sst/cluster/{Resource.Cluster.name}/{naming.physical(64, "papercut-tailgate")}/{args.tenant_id}",
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                ignore_changes=["name"],
            )
        )

        self.__papercut_tailgate_task_role = aws.iam.Role(
            resource_name="PapercutTailgateTaskRole",
            args=aws.iam.RoleArgs(
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[aws.iam.GetPolicyDocumentStatementArgs(
                        actions=["sts:AssumeRole"],
                        principals=[aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                            type="Service",
                            identifiers=["ecs-tasks.amazonaws.com"]
                        )]
                    )]
                ).json,
                inline_policies=[
                    aws.iam.RoleInlinePolicyArgs(
                        policy=aws.iam.get_policy_document_output(
                            statements=pulumi.Output.all(
                                pulumi.Output.from_input(args.dynamic_config.application.arn),
                                pulumi.Output.from_input(args.dynamic_config.environment.arn),
                                pulumi.Output.from_input(args.dynamic_config.profiles.papercut_server_tailnet_uri.arn),
                                pulumi.Output.from_input(args.dynamic_config.profiles.papercut_server_auth_token.arn),
                                pulumi.Output.from_input(args.dynamic_config.profiles.tailscale_oauth_client.arn),
                            ).apply(lambda appconfig_resources: [
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=[
                                        "ssmmessages:CreateControlChannel",
                                        "ssmmessages:CreateDataChannel",
                                        "ssmmessages:OpenControlChannel",
                                        "ssmmessages:OpenDataChannel",
                                    ],
                                    resources=["*"],
                                ),
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=[
                                        "appconfig:StartConfigurationSession",
                                        "appconfig:GetLatestConfiguration"
                                    ],
                                    resources=appconfig_resources
                                )
                            ])
                        ).json
                    )
                ]
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        appconfig_agent_port = 2772
        self.__papercut_tailgate_task_definition = aws.ecs.TaskDefinition(
            resource_name="PapercutTailgateTaskDefinition",
            args=aws.ecs.TaskDefinitionArgs(
                family=f"{Resource.Cluster.name}-{args.tenant_id}-papercut-tailgate",
                track_latest=True,
                cpu="256",
                memory="512",
                network_mode="awsvpc",
                requires_compatibilities=["FARGATE"],
                runtime_platform=aws.ecs.TaskDefinitionRuntimePlatformArgs(
                    cpu_architecture="ARM64",
                    operating_system_family="LINUX",
                ),
                execution_role_arn=Resource.PapercutTailgateExecutionRole.arn,
                task_role_arn=self.__papercut_tailgate_task_role.arn,
                container_definitions=pulumi.Output.json_dumps([
                    {
                        "name": "appconfig-agent",
                        "image": "public.ecr.aws/aws-appconfig/aws-appconfig-agent:2.x",
                        "essential": True,
                        "pseudoTerminal": True,
                        "portMappings": [
                            {
                                "containerPort": appconfig_agent_port,
                                "protocol": "tcp",
                            }
                        ],
                        "healthCheck": {
                            "command": [
                                "CMD-SHELL",
                                f"curl -fSs http://localhost:{appconfig_agent_port}/ping || exit 1"
                            ],
                            "interval": 30,
                            "timeout": 5,
                            "retries": 3,
                            "startPeriod": 10,
                        },
                        "logConfiguration": {
                            "logDriver": "awslogs",
                            "options": {
                                "awslogs-group": self.__papercut_tailgate_log_group.name,
                                "awslogs-region": Resource.Aws.region,
                                "awslogs-stream-prefix": "appconfig-agent",
                            }
                        },
                        "linuxParameters": {
                            "initProcessEnabled": True,
                        },
                        "environment": [
                            {
                                "name": "HTTP_PORT",
                                "value": str(appconfig_agent_port)
                            },
                            {
                                "name": "PREFETCH_LIST",
                                "value": pulumi.Output.format(
                                    "{0}:{1}:{2},{0}:{1}:{3},{0}:{1}:{4}",
                                    args.dynamic_config.application.name,
                                    args.dynamic_config.environment.name,
                                    args.dynamic_config.profiles.papercut_server_tailnet_uri.name,
                                    args.dynamic_config.profiles.papercut_server_auth_token.name,
                                    args.dynamic_config.profiles.tailscale_oauth_client.name
                                ),
                            }
                        ],
                        "secrets": [
                            {
                                "name": "ACCESS_TOKEN",
                                "valueFrom": args.static_config.parameters.agent_access_token.arn,
                            }
                        ]
                    },
                    {
                        "name": "papercut-tailgate",
                        "image": Resource.PapercutTailgateImage.uri,
                        "essential": True,
                        "pseudoTerminal": True,
                        "dependsOn": [
                            {
                                "containerName": "appconfig-agent",
                                "condition": "HEALTHY",
                            }
                        ],
                        "portMappings": [{"containerPortRage": "1-65535"}],
                        "logConfiguration": {
                            "logDriver": "awslogs",
                            "options": {
                                "awslogs-group": self.__papercut_tailgate_log_group.name,
                                "awslogs-region": Resource.Aws.region,
                                "awslogs-stream-prefix": "papercut-tailgate",
                            }
                        },
                        "linuxParameters": {
                            "initProcessEnabled": True,
                        },
                        "environment": [
                            {
                                "name": "TENANT_ID",
                                "value": args.tenant_id,
                            },
                            {
                                "name": "APPCONFIG_AGENT_PORT",
                                "value": str(appconfig_agent_port)
                            },
                            {
                                "name": "PORT",
                                "value": "80",
                            },
                            {
                                "name": "SST_RESOURCE_AppConfig",
                                "value": pulumi.Output.json_dumps({
                                    "application": args.dynamic_config.application.name,
                                    "environment": args.dynamic_config.environment.name,
                                    "profiles": {
                                        "papercut_server_tailnet_uri":
                                            args.dynamic_config.profiles.papercut_server_tailnet_uri.name,
                                        "papercut_server_auth_token":
                                            args.dynamic_config.profiles.papercut_server_auth_token.name,
                                        "tailscale_oauth_client":
                                            args.dynamic_config.profiles.tailscale_oauth_client.name,
                                    }
                                })
                            }
                        ],
                        "secrets": [
                            {
                                "name": "APPCONFIG_AGENT_ACCESS_TOKEN",
                                "valueFrom": args.static_config.parameters.agent_access_token.arn,
                            },
                            {
                                "name": "SST_KEY",
                                "valueFrom": Resource.PapercutTailgateSstKeyParameter.arn,
                            },
                            {
                                "name": "SST_RESOURCE_RouterSecret",
                                "valueFrom": args.static_config.parameters.router_secret_sst_resource.arn,
                            }
                        ]
                    }
                ]),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__papercut_tailgate_cloud_map_service = aws.servicediscovery.Service(
            resource_name="PapercutTailgateCloudMapService",
            args=aws.servicediscovery.ServiceArgs(
                name=f"{args.tenant_id}.papercut-tailgate.{Resource.AppData.stage}.{Resource.AppData.name}",
                namespace_id=Resource.Vpc.cloudMapNamespaceId,
                force_destroy=True,
                dns_config=aws.servicediscovery.ServiceDnsConfigArgs(
                    namespace_id=Resource.Vpc.cloudMapNamespaceId,
                    dns_records=[
                        aws.servicediscovery.ServiceDnsConfigDnsRecordArgs(
                            type="SRV",
                            ttl=60,
                        ),
                        aws.servicediscovery.ServiceDnsConfigDnsRecordArgs(
                            type="A",
                            ttl=60,
                        )
                    ]
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__papercut_tailgate_service = aws.ecs.Service(
            resource_name="PapercutTailgateService",
            args=aws.ecs.ServiceArgs(
                cluster=Resource.Cluster.arn,
                task_definition=self.__papercut_tailgate_task_definition.arn,
                desired_count=1,
                force_new_deployment=True,
                capacity_provider_strategies=[
                    aws.ecs.ServiceCapacityProviderStrategyArgs(
                        capacity_provider="FARGATE",
                        weight=0,
                    ),
                    aws.ecs.ServiceCapacityProviderStrategyArgs(
                        capacity_provider="FARGATE_SPOT",
                        weight=1
                    ),
                ],
                network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
                    assign_public_ip=True,
                    subnets=aws.ec2.get_subnets_output(
                        filters=[
                            aws.ec2.GetSubnetsFilterArgs(
                                name="vpc-id",
                                values=[Resource.Vpc.id],
                            ),
                            aws.ec2.GetSubnetsFilterArgs(
                                name="map-public-ip-on-launch",
                                values=["true"],
                            ),
                        ]
                    ).ids,
                    security_groups=aws.ec2.get_security_groups_output(
                        filters=[
                            aws.ec2.GetSecurityGroupsFilterArgs(
                                name="vpc-id",
                                values=[Resource.Vpc.id],
                            ),
                            aws.ec2.GetSecurityGroupsFilterArgs(
                                name="ip-permission.protocol",
                                values=["-1"],
                            ),
                            aws.ec2.GetSecurityGroupsFilterArgs(
                                name="ip-permission.cidr",
                                values=[Resource.Vpc.cidrBlock]
                            ),
                            aws.ec2.GetSecurityGroupsFilterArgs(
                                name="egress.ip-permission.protocol",
                                values=["-1"],
                            ),
                            aws.ec2.GetSecurityGroupsFilterArgs(
                                name="egress.ip-permission.cidr",
                                values=["0.0.0.0/0"]
                            ),
                        ]
                    ).ids,
                ),
                deployment_circuit_breaker=aws.ecs.ServiceDeploymentCircuitBreakerArgs(
                    enabled=True,
                    rollback=True,
                ),
                enable_execute_command=True,
                service_registries=aws.ecs.ServiceServiceRegistriesArgs(
                    registry_arn=self.__papercut_tailgate_cloud_map_service.arn,
                    port=80,
                ),
                wait_for_steady_state=False,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_tailgate_auto_scaling_target = aws.appautoscaling.Target(
            resource_name="PapercutTailgateAutoScalingTarget",
            args=aws.appautoscaling.TargetArgs(
                service_namespace="ecs",
                scalable_dimension="ecs:service:DesiredCount",
                resource_id=pulumi.Output.format(
                    "service/{0}/{1}",
                    Resource.Cluster.name,
                    self.__papercut_tailgate_service.name,
                ),
                min_capacity=1,
                max_capacity=1,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_integration = aws.apigatewayv2.Integration(
            resource_name="PapercutServerIntegration",
            args=aws.apigatewayv2.IntegrationArgs(
                api_id=self.__api.id,
                connection_id=Resource.VpcLink.id,
                connection_type="VPC_LINK",
                integration_type="HTTP_PROXY",
                integration_uri=self.__papercut_tailgate_cloud_map_service.arn,
                integration_method="ANY",
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__papercut_server_route = aws.apigatewayv2.Route(
            resource_name="PapercutServerRoute",
            args=aws.apigatewayv2.RouteArgs(
                api_id=self.__api.id,
                route_key="/papercut/server/{proxy+}",
                target=pulumi.Output.format(
                    "integrations/{0}",
                    self.__papercut_server_integration.id
                ),
                authorization_type="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.register_outputs(
            {
                "api": self.__api.id,
                "log_group": self.__log_group.id,
                "stage": self.__stage.id,
                "api_function_name": self.__api_function_name.result,
                "api_function_log_group": self.__api_function_log_group.id,
                "api_function": self.__api_function.id,
                "api_function_permission": self.__api_function_permission.id,
                "api_function_integration": self.__api_function_integration.id,
                "api_function_route": self.__api_function_route.id,
                "papercut_tailgate_log_group": self.__papercut_tailgate_log_group.id,
                "papercut_tailgate_task_role": self.__papercut_tailgate_task_role.id,
                "papercut_tailgate_task_definition": self.__papercut_tailgate_task_definition.id,
                "papercut_tailgate_cloud_map_service": self.__papercut_tailgate_cloud_map_service.id,
                "papercut_tailgate_service": self.__papercut_tailgate_service.id,
                "papercut_tailgate_auto_scaling_target": self.__papercut_tailgate_auto_scaling_target.id,
                "papercut_server_integration": self.__papercut_server_integration.id,
                "papercut_server_route": self.__papercut_server_route.id,
            }
        )
