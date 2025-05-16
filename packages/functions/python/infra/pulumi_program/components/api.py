import json
from datetime import datetime

import pulumi
import pulumi_aws as aws

from sst import Resource
from utils import build_name, tags

from typing import Optional, Mapping, List


def setup_api_gateway_account() -> pulumi.Output[aws.apigateway.Account]:
    account = aws.apigateway.Account.get(
        resource_name="APIGatewayAccount",
        id="APIGatewayAccount",
    )

    def create_role(arn):
        if arn:
            return account

        role = aws.iam.Role(
            resource_name="APIGatewayPushToCloudWatchLogsRole",
            args=aws.iam.RoleArgs(
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="Service",
                                    identifiers=["apigateway.amazonaws.com"],
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).minified_json,
                managed_policy_arns=[
                    aws.iam.ManagedPolicy.AMAZON_API_GATEWAY_PUSH_TO_CLOUD_WATCH_LOGS
                ],
            ),
            opts=pulumi.ResourceOptions(retain_on_delete=True),
        )

        return aws.apigateway.Account(
            resource_name="APIGatewayAccountSetup",
            args=aws.apigateway.AccountArgs(cloudwatch_role_arn=role.arn),
        )

    return account.cloudwatch_role_arn.apply(create_role)


class ApiArgs:
    def __init__(
        self,
        tenant_id: str,
        reverse_dns: pulumi.Input[str],
        invoices_processor_queue_name: pulumi.Input[str],
        assets_bucket_name: pulumi.Input[str],
        documents_bucket_name: pulumi.Input[str],
        realtime_http_dns: pulumi.Input[str],
        realtime_dns: pulumi.Input[str],
        papercut_secure_reverse_proxy_function_name: pulumi.Input[str],
        event_bus_name: pulumi.Input[str],
        distribution_id: pulumi.Input[str],
    ):
        self.tenant_id = tenant_id
        self.reverse_dns = reverse_dns
        self.invoices_processor_queue_name = invoices_processor_queue_name
        self.assets_bucket_name = assets_bucket_name
        self.documents_bucket_name = documents_bucket_name
        self.realtime_http_dns = realtime_http_dns
        self.realtime_dns = realtime_dns
        self.papercut_secure_reverse_proxy_function_name = (
            papercut_secure_reverse_proxy_function_name
        )
        self.event_bus_name = event_bus_name
        self.distribution_id = distribution_id


class Api(pulumi.ComponentResource):
    def __init__(self, args: ApiArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(t="pd:resource:Api", name="Api", props=vars(args), opts=opts)

        self.__api_gateway_account = setup_api_gateway_account()

        self.__rest_api = aws.apigateway.RestApi(
            resource_name="RestApi",
            args=aws.apigateway.RestApiArgs(
                endpoint_configuration=aws.apigateway.RestApiEndpointConfigurationArgs(
                    types="REGIONAL"
                ),
                disable_execute_api_endpoint=True,
                description=f"{args.tenant_id} gateway",
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(depends_on=[self.__api_gateway_account]),
        )

        self.__execution_role = aws.iam.Role(
            resource_name="ApiExecutionRole",
            args=aws.iam.RoleArgs(
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            actions=["sts:AssumeRole"],
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="Service",
                                    identifiers=["apigateway.amazonaws.com"],
                                )
                            ],
                        )
                    ]
                ).minified_json,
                managed_policy_arns=[
                    aws.iam.ManagedPolicy.AMAZON_API_GATEWAY_PUSH_TO_CLOUD_WATCH_LOGS
                ],
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__execution_role_policy: pulumi.Output[aws.iam.RolePolicy] = (
            pulumi.Output.all(
                aws.kms.get_alias_output(name="alias/aws/ssm").target_key_arn,
                aws.cloudwatch.get_event_bus_output(name=args.event_bus_name).arn,
                aws.sqs.get_queue_output(name=args.invoices_processor_queue_name).arn,
                aws.cloudfront.get_distribution_output(id=args.distribution_id).arn,
            ).apply(
                lambda arns: aws.iam.RolePolicy(
                    resource_name="ApiExecutionRolePolicy",
                    args=aws.iam.RolePolicyArgs(
                        role=self.__execution_role.name,
                        policy=aws.iam.get_policy_document_output(
                            statements=[
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["ssm:GetParameter"],
                                    resources=[
                                        f"arn:aws:ssm:{Resource.Aws.region}:{Resource.Aws.account.id}:parameter{name}"
                                        for name in [
                                            build_name(
                                                Resource.TenantParameters.documentsMimeTypes.nameTemplate,
                                                args.tenant_id,
                                            ),
                                            build_name(
                                                Resource.TenantParameters.documentsSizeLimit.nameTemplate,
                                                args.tenant_id,
                                            ),
                                            build_name(
                                                Resource.TenantParameters.papercutServerAuthToken.nameTemplate,
                                                args.tenant_id,
                                            ),
                                        ]
                                    ],
                                ),
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["kms:Decrypt"],
                                    resources=[arns[0]],
                                ),
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["events:PutEvents"],
                                    resources=[arns[1]],
                                ),
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["sqs:SendMessage"],
                                    resources=[arns[2]],
                                ),
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["cloudfront:CreateInvalidation"],
                                    resources=[arns[3]],
                                ),
                            ]
                        ).minified_json,
                    ),
                    opts=pulumi.ResourceOptions(parent=self),
                )
            )
        )

        self.__health_resource = aws.apigateway.Resource(
            resource_name="ApiHealthResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__rest_api.root_resource_id,
                path_part="health",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_method = aws.apigateway.Method(
            resource_name="ApiHealthMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__health_resource.id,
                http_method="GET",
                authorization="NONE",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_method_response = aws.apigateway.MethodResponse(
            resource_name="ApiHealthMethodResponse",
            args=aws.apigateway.MethodResponseArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__health_resource.id,
                http_method=self.__health_method.http_method,
                status_code="200",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_integration = aws.apigateway.Integration(
            resource_name="ApiHealthIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__health_resource.id,
                http_method=self.__health_method.http_method,
                type="MOCK",
                request_templates={"application/json": json.dumps({"statusCode": 200})},
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_integration_response = aws.apigateway.IntegrationResponse(
            resource_name="ApiHealthIntegrationResponse",
            args=aws.apigateway.IntegrationResponseArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__health_resource.id,
                http_method=self.__health_method.http_method,
                status_code=self.__health_method_response.status_code,
                response_templates={"text/plain": "OK"},
            ),
            opts=pulumi.ResourceOptions(
                parent=self, depends_on=[self.__health_integration]
            ),
        )

        self.__health_cors_route = CorsRoute(
            name="ApiHealth",
            args=CorsRouteArgs(
                rest_api_id=self.__rest_api.id,
                resource_id=self.__health_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__well_known_resource = aws.apigateway.Resource(
            resource_name="ApiWellKnownResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__rest_api.root_resource_id,
                path_part=".well-known",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__app_specific_resource = aws.apigateway.Resource(
            resource_name="ApiWellKnownAppSpecificResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__well_known_resource.id,
                path_part="appspecific",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__realtime_route = WellKnownAppSpecificRoute(
            name="ApiRealtime",
            args=WellKnownAppSpecificRouteArgs(
                rest_api_id=self.__rest_api.id,
                parent_id=self.__app_specific_resource.id,
                path_part=pulumi.Output.format("{0}.realtime.json", args.reverse_dns),
                response_templates={
                    "application/json": pulumi.Output.json_dumps(
                        {
                            "http": args.realtime_http_dns,
                            "realtime": args.realtime_dns,
                        }
                    )
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__buckets_route = WellKnownAppSpecificRoute(
            name="ApiBuckets",
            args=WellKnownAppSpecificRouteArgs(
                rest_api_id=self.__rest_api.id,
                parent_id=self.__app_specific_resource.id,
                path_part=pulumi.Output.format("{0}.buckets.json", args.reverse_dns),
                response_templates={
                    "application/json": pulumi.Output.json_dumps(
                        {
                            "assets": args.assets_bucket_name,
                            "documents": args.documents_bucket_name,
                        }
                    )
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_resource = aws.apigateway.Resource(
            resource_name="ApiParametersResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__rest_api.root_resource_id,
                path_part="parameters",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_resource = aws.apigateway.Resource(
            resource_name="ApiParametersProxyResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__parameters_resource.id,
                path_part="{proxy+}",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_method = aws.apigateway.Method(
            resource_name="ApiParametersProxyMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__parameters_proxy_resource.id,
                http_method="GET",
                authorization="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_integration = aws.apigateway.Integration(
            resource_name="ApiParametersProxyIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__parameters_proxy_resource.id,
                http_method=self.__parameters_proxy_method.http_method,
                type="AWS",
                integration_http_method="POST",
                request_parameters={
                    "integration.request.header.Content-Type": "'application/x-amz-json-1.1'",
                    "integration.request.header.X-Amz-Target": "'AmazonSSM.GetParameter'",
                },
                request_templates={
                    "application/json": "\n".join(
                        [
                            """{""",
                            """  "Name": "/$util.escapeJavaScript($input.params().path.get('proxy'))",""",
                            """  "WithDecryption": true""",
                            """}""",
                        ]
                    )
                },
                passthrough_behavior="NEVER",
                uri=f"arn:aws:apigateway:{Resource.Aws.region}:ssm:path//",
                credentials=self.__execution_role.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_responses = Responses(
            name="ApiParametersProxy",
            args=ResponsesArgs(
                status_codes=[200, 400, 403, 500, 503],
                rest_api_id=self.__rest_api.id,
                resource_id=self.__parameters_proxy_resource.id,
                http_method=self.__parameters_proxy_method.http_method,
                cache_max_age=31536000,
            ),
            opts=pulumi.ResourceOptions(
                parent=self, depends_on=[self.__parameters_proxy_integration]
            ),
        )

        self.__parameters_proxy_cors_route = CorsRoute(
            name="ApiParametersProxy",
            args=CorsRouteArgs(
                rest_api_id=self.__rest_api.id,
                resource_id=self.__parameters_proxy_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_resource = aws.apigateway.Resource(
            resource_name="ApiPapercutResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__rest_api.root_resource_id,
                path_part="papercut",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_resource = aws.apigateway.Resource(
            resource_name="ApiPapercutServerResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__papercut_resource.id,
                path_part="server",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_resource = aws.apigateway.Resource(
            resource_name="ApiPapercutServerProxyResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__papercut_server_resource.id,
                path_part="{proxy+}",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_method = aws.apigateway.Method(
            resource_name="ApiPapercutServerProxyMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__papercut_server_proxy_resource.id,
                http_method="ANY",
                authorization="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_integration = aws.apigateway.Integration(
            resource_name="ApiPapercutServerProxyIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__papercut_server_proxy_resource.id,
                http_method=self.__papercut_server_proxy_method.http_method,
                type="AWS_PROXY",
                integration_http_method="POST",
                passthrough_behavior="WHEN_NO_TEMPLATES",
                uri=aws.lambda_.get_function_output(
                    function_name=args.papercut_secure_reverse_proxy_function_name
                ).invoke_arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invoke_papercut_secure_reverse_proxy_permission = aws.lambda_.Permission(
            resource_name="ApiInvokePapercutSecureReverseProxyPermission",
            args=aws.lambda_.PermissionArgs(
                function=args.papercut_secure_reverse_proxy_function_name,
                principal="apigateway.amazonaws.com",
                action="lambda:InvokeFunction",
                source_arn=pulumi.Output.format(
                    "{0}/*/*/papercut/server/*",
                    pulumi.Output.from_input(self.__rest_api.execution_arn),
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_cors_route = CorsRoute(
            name="ApiPapercutServerProxy",
            args=CorsRouteArgs(
                rest_api_id=self.__rest_api.id,
                resource_id=self.__papercut_server_proxy_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_sync_route = EventRoute(
            name="ApiPapercutSync",
            args=EventRouteArgs(
                rest_api_id=self.__rest_api.id,
                parent_id=self.__papercut_resource.id,
                path_part="sync",
                execution_role_arn=self.__execution_role.arn,
                request_template=pulumi.Output.json_dumps(
                    {
                        "Entries": [
                            {
                                "Detail": json.dumps({"tenantId": args.tenant_id}),
                                "DetailType": "PapercutSync",
                                "EventBusName": args.event_bus_name,
                                "Source": args.reverse_dns,
                            }
                        ]
                    }
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invoices_resource = aws.apigateway.Resource(
            resource_name="ApiInvoicesResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__rest_api.root_resource_id,
                path_part="invoices",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__enqueue_invoice_request_validator = aws.apigateway.RequestValidator(
            resource_name="ApiEnqueueInvoiceRequestValidator",
            args=aws.apigateway.RequestValidatorArgs(
                rest_api=self.__rest_api.id,
                validate_request_body=True,
                validate_request_parameters=False,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__enqueue_invoice_request_model = aws.apigateway.Model(
            resource_name="ApiEnqueueInvoiceRequestModel",
            args=aws.apigateway.ModelArgs(
                rest_api=self.__rest_api.id,
                name="EnqueueInvoiceRequestModel",
                content_type="application/json",
                schema=json.dumps(
                    {
                        "$schema": "http://json-schema.org/draft-04/schema#",
                        "title": "EnqueueInvoiceRequestModel",
                        "type": "object",
                        "properties": {"invoiceId": {"type": "string"}},
                        "required": ["invoiceId"],
                        "additionalProperties": False,
                    }
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__enqueue_invoice_method = aws.apigateway.Method(
            resource_name="ApiEnqueueInvoiceMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__invoices_resource.id,
                http_method="POST",
                authorization="AWS_IAM",
                request_validator_id=self.__enqueue_invoice_request_validator.id,
                request_models={
                    "application/json": self.__enqueue_invoice_request_model.name
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__enqueue_invoice_integration = aws.apigateway.Integration(
            resource_name="ApiEnqueueInvoiceIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__invoices_resource.id,
                http_method=self.__enqueue_invoice_method.http_method,
                type="AWS",
                integration_http_method="POST",
                request_parameters={
                    "integration.request.header.Content-Type": "'application/x-amz-json-1.0'",
                    "integration.request.header.X-Amz-Target": "'AmazonSQS.SendMessage'",
                },
                request_templates={
                    "application/json": pulumi.Output.json_dumps(
                        {
                            "QueueUrl": aws.sqs.get_queue_output(
                                name=args.invoices_processor_queue_name
                            ).url,
                            "MessageBody": json.dumps(
                                {
                                    "invoiceId": "$util.escapeJavaScript($input.path('$.invoiceId'))",
                                    "tenantId": args.tenant_id,
                                }
                            ),
                            "MessageGroupId": args.tenant_id,
                        }
                    )
                },
                passthrough_behavior="NEVER",
                uri=f"arn:aws:apigateway:{Resource.Aws.region}:sqs:path//",
                credentials=self.__execution_role.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__enqueue_invoice_responses = Responses(
            name="ApiEnqueueInvoice",
            args=ResponsesArgs(
                status_codes=[200, 400, 403, 500, 503],
                rest_api_id=self.__rest_api.id,
                resource_id=self.__invoices_resource.id,
                http_method=self.__enqueue_invoice_method.http_method,
                cache_max_age=0,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                depends_on=[self.__enqueue_invoice_integration],
            ),
        )

        self.__enqueue_invoice_cors_route = CorsRoute(
            name="ApiEnqueueInvoice",
            args=CorsRouteArgs(
                rest_api_id=self.__rest_api.id,
                resource_id=self.__invoices_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__cdn_resource = aws.apigateway.Resource(
            resource_name="ApiCdnResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__rest_api.root_resource_id,
                path_part="cdn",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invalidation_resource = aws.apigateway.Resource(
            resource_name="ApiInvalidationResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__rest_api.id,
                parent_id=self.__cdn_resource.id,
                path_part="invalidation",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invalidation_request_validator = aws.apigateway.RequestValidator(
            resource_name="ApiInvalidationRequestValidator",
            args=aws.apigateway.RequestValidatorArgs(
                rest_api=self.__rest_api.id,
                validate_request_body=True,
                validate_request_parameters=False,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invalidation_request_model = aws.apigateway.Model(
            resource_name="ApiInvalidationRequestModel",
            args=aws.apigateway.ModelArgs(
                rest_api=self.__rest_api.id,
                name="InvalidationRequestModel",
                content_type="application/json",
                schema=json.dumps(
                    {
                        "$schema": "http://json-schema.org/draft-04/schema#",
                        "title": "InvalidationRequestModel",
                        "type": "object",
                        "properties": {
                            "paths": {
                                "type": "array",
                                "minItems": 1,
                                "maxItems": 100,
                                "items": {
                                    "type": "string",
                                    "pattern": "^/.*$",
                                    "minLength": 1,
                                    "maxLength": 4096,
                                },
                            }
                        },
                        "required": ["paths"],
                        "additionalProperties": False,
                    }
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invalidation_method = aws.apigateway.Method(
            resource_name="ApiInvalidationMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__invalidation_resource.id,
                http_method="POST",
                authorization="AWS_IAM",
                request_validator_id=self.__invalidation_request_validator.id,
                request_models={
                    "application/json": self.__invalidation_request_model.name,
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invalidation_integration = aws.apigateway.Integration(
            resource_name="ApiInvalidationIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__rest_api.id,
                resource_id=self.__invalidation_resource.id,
                http_method=self.__invalidation_method.http_method,
                type="AWS",
                integration_http_method="POST",
                request_parameters={
                    "integration.request.header.Content-Type": "'application/xml'"
                },
                request_templates={
                    "application/json": "\n".join(
                        [
                            """#set($paths = $input.path('$.paths'))""",
                            """#set($quantity = $paths.size())""",
                            """<?xml version="1.0" encoding="UTF-8"?>""",
                            """<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2020-05-31/">""",
                            """  <CallerReference>$context.requestId</CallerReference>""",
                            """  <Paths>""",
                            """    <Quantity>$quantity</Quantity>""",
                            """    <Items>""",
                            """    #foreach($path in $paths)""",
                            """      <Path>$path</Path>""",
                            """    #end""",
                            """    </Items>""",
                            """  </Paths>""",
                            """</InvalidationBatch>""",
                        ]
                    )
                },
                passthrough_behavior="NEVER",
                uri=pulumi.Output.format(
                    "arn:aws:apigateway:{0}:cloudfront:path/2020-05-31/distribution/{1}/invalidation",
                    Resource.Aws.region,
                    args.distribution_id,
                ),
                credentials=self.__execution_role.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invalidation_responses = Responses(
            name="ApiInvalidation",
            args=ResponsesArgs(
                status_codes=[201, 400, 403, 404, 413, 500, 503],
                rest_api_id=self.__rest_api.id,
                resource_id=self.__invalidation_resource.id,
                http_method=self.__invalidation_method.http_method,
                cache_max_age=0,
            ),
            opts=pulumi.ResourceOptions(
                parent=self, depends_on=[self.__invalidation_integration]
            ),
        )

        self.__invalidation_cors_route = CorsRoute(
            name="ApiInvalidation",
            args=CorsRouteArgs(
                rest_api_id=self.__rest_api.id,
                resource_id=self.__invalidation_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__cors_response_4xx = aws.apigateway.Response(
            resource_name="ApiCorsResponse4xx",
            args=aws.apigateway.ResponseArgs(
                rest_api_id=self.__rest_api.id,
                response_type="DEFAULT_4XX",
                response_parameters={
                    "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
                    "gatewayresponse.header.Access-Control-Allow-Headers": "'*'",
                },
                response_templates={
                    "application/json": '{"message":$context.error.messageString}',
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__cors_response_5xx = aws.apigateway.Response(
            resource_name="ApiCorsResponse5xx",
            args=aws.apigateway.ResponseArgs(
                rest_api_id=self.__rest_api.id,
                response_type="DEFAULT_5XX",
                response_parameters={
                    "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
                    "gatewayresponse.header.Access-Control-Allow-Headers": "'*'",
                },
                response_templates={
                    "application/json": '{"message":$context.error.messageString}',
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__api_access_role = aws.iam.Role(
            resource_name="ApiAccessRole",
            args=aws.iam.RoleArgs(
                name=build_name(
                    name_template=Resource.TenantRoles.apiAccess.nameTemplate,
                    tenant_id=args.tenant_id,
                ),
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS",
                                    identifiers=[
                                        Resource.Api.roleArn,
                                        Resource.PapercutSync.roleArn,
                                    ],
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ],
                ).minified_json,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__api_access_role_policy: pulumi.Output[aws.iam.RolePolicy] = (
            self.__rest_api.execution_arn.apply(
                lambda execution_arn: aws.iam.RolePolicy(
                    resource_name="ApiAccessRolePolicy",
                    args=aws.iam.RolePolicyArgs(
                        role=self.__api_access_role.name,
                        policy=aws.iam.get_policy_document_output(
                            statements=[
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["execute-api:Invoke"],
                                    resources=[
                                        f"{execution_arn}/{Resource.Aws.region}/*"
                                    ],
                                )
                            ]
                        ).minified_json,
                    ),
                    opts=pulumi.ResourceOptions(parent=self),
                )
            )
        )

        self.register_outputs(
            {
                "apigateway_account": self.__api_gateway_account.apply(
                    lambda account: account.id
                ),
                "rest_api": self.__rest_api.id,
                "execution_role": self.__execution_role.id,
                "execution_role_policy": self.__execution_role_policy.apply(
                    lambda policy: policy.id
                ),
                "health_resource": self.__health_resource.id,
                "health_method": self.__health_method.id,
                "health_method_response": self.__health_method_response.id,
                "health_integration": self.__health_integration.id,
                "health_integration_response": self.__health_integration_response.id,
                "well_known_resource": self.__well_known_resource.id,
                "app_specific_resource": self.__app_specific_resource.id,
                "parameters_resource": self.__parameters_resource.id,
                "parameters_proxy_resource": self.__parameters_proxy_resource.id,
                "parameters_proxy_method": self.__parameters_proxy_method.id,
                "parameters_proxy_integration": self.__parameters_proxy_integration.id,
                "papercut_resource": self.__papercut_resource.id,
                "papercut_server_resource": self.__papercut_server_resource.id,
                "papercut_server_proxy_resource": self.__papercut_server_proxy_resource.id,
                "papercut_server_proxy_method": self.__papercut_server_proxy_method.id,
                "papercut_server_proxy_integration": self.__papercut_server_proxy_integration.id,
                "invoke_papercut_secure_reverse_proxy_permission": self.__invoke_papercut_secure_reverse_proxy_permission.id,
                "invoices_resource": self.__invoices_resource.id,
                "enqueue_invoice_request_validator": self.__enqueue_invoice_request_validator.id,
                "enqueue_invoice_request_model": self.__enqueue_invoice_request_model.id,
                "enqueue_invoice_method": self.__enqueue_invoice_method.id,
                "enqueue_invoice_integration": self.__enqueue_invoice_integration.id,
                "cdn_resource": self.__cdn_resource.id,
                "invalidation_resource": self.__invalidation_resource.id,
                "invalidation_request_validator": self.__invalidation_request_validator.id,
                "invalidation_request_model": self.__invalidation_request_model.id,
                "invalidation_method": self.__invalidation_method.id,
                "invalidation_integration": self.__invalidation_integration.id,
                "cors_response_4xx": self.__cors_response_4xx.id,
                "cors_response_5xx": self.__cors_response_5xx.id,
                "api_access_role": self.__api_access_role.id,
                "api_access_role_policy": self.__api_access_role_policy.apply(
                    lambda policy: policy.id
                ),
            }
        )

    @property
    def rest_api(self):
        return self.__rest_api


class WellKnownAppSpecificRouteArgs:
    def __init__(
        self,
        rest_api_id: pulumi.Input[str],
        parent_id: pulumi.Input[str],
        path_part: pulumi.Input[str],
        response_templates: pulumi.Input[Mapping[str, pulumi.Input[str]]],
    ):
        self.rest_api_id = rest_api_id
        self.parent_id = parent_id
        self.path_part = path_part
        self.response_templates = response_templates


class WellKnownAppSpecificRoute(pulumi.ComponentResource):
    """
    NOTE: The well-known app-specific resources are following the registered IANA specification:
    https://www.github.com/Vroo/well-known-uri-appspecific/blob/main/well-known-uri-for-application-specific-purposes.txt
    https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml
    """

    def __init__(
        self,
        name: str,
        args: WellKnownAppSpecificRouteArgs,
        opts: pulumi.ResourceOptions,
    ):
        super().__init__(
            t="pd:resource:WellKnownAppSpecificRoute",
            name=f"{name}WellKnownAppSpecificRoute",
            props=vars(args),
            opts=opts,
        )

        self.__resource = aws.apigateway.Resource(
            resource_name=f"{name}WellKnownAppSpecificResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=args.rest_api_id,
                parent_id=args.parent_id,
                path_part=args.path_part,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__method = aws.apigateway.Method(
            resource_name=f"{name}WellKnownAppSpecificMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=args.rest_api_id,
                resource_id=self.__resource.id,
                http_method="GET",
                authorization="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__method_response = aws.apigateway.MethodResponse(
            resource_name=f"{name}WellKnownAppSpecificMethodResponse",
            args=aws.apigateway.MethodResponseArgs(
                rest_api=args.rest_api_id,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                status_code="200",
                response_parameters={
                    "method.response.header.Cache-Control": True,
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration = aws.apigateway.Integration(
            resource_name=f"{name}WellKnownAppSpecificIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=args.rest_api_id,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                type="MOCK",
                request_templates={"application/json": json.dumps({"statusCode": 200})},
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration_response = aws.apigateway.IntegrationResponse(
            resource_name=f"{name}WellKnownAppSpecificIntegrationResponse",
            args=aws.apigateway.IntegrationResponseArgs(
                rest_api=args.rest_api_id,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                status_code=self.__method_response.status_code,
                response_templates=args.response_templates,
                response_parameters={
                    "method.response.header.Cache-Control": "'max-age=31536000, public'",
                },
            ),
            opts=pulumi.ResourceOptions(parent=self, depends_on=[self.__integration]),
        )

        self.__cors_route = CorsRoute(
            name=f"{name}WellKnownAppSpecific",
            args=CorsRouteArgs(
                rest_api_id=args.rest_api_id,
                resource_id=self.__resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "resource": self.__resource.id,
                "method": self.__method.id,
                "method_response": self.__method_response.id,
                "integration": self.__integration.id,
                "integration_response": self.__integration_response.id,
            }
        )


class EventRouteArgs:
    def __init__(
        self,
        rest_api_id: pulumi.Input[str],
        parent_id: pulumi.Input[str],
        path_part: pulumi.Input[str],
        execution_role_arn: pulumi.Input[str],
        request_template: Optional[pulumi.Input[str]] = None,
    ):
        self.rest_api_id = rest_api_id
        self.parent_id = parent_id
        self.path_part = path_part
        self.execution_role_arn = execution_role_arn
        self.request_template = request_template


class EventRoute(pulumi.ComponentResource):
    def __init__(self, name: str, args: EventRouteArgs, opts: pulumi.ResourceOptions):
        super().__init__(
            t="pd:resource:EventRoute",
            name=f"{name}EventRoute",
            props=vars(args),
            opts=opts,
        )

        self.__resource = aws.apigateway.Resource(
            resource_name=f"{name}Resource",
            args=aws.apigateway.ResourceArgs(
                rest_api=args.rest_api_id,
                parent_id=args.parent_id,
                path_part=args.path_part,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__method = aws.apigateway.Method(
            resource_name=f"{name}Method",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__resource.rest_api,
                resource_id=self.__resource.id,
                http_method="POST",
                authorization="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration = aws.apigateway.Integration(
            resource_name=f"{name}Integration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=args.rest_api_id,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                type="AWS",
                integration_http_method="POST",
                request_parameters={
                    "integration.request.header.Content-Type": "'application/x-amz-json-1.1'",
                    "integration.request.header.X-Amz-Target": "'AWSEvents.PutEvents'",
                },
                request_templates=(
                    {"application/json": args.request_template}
                    if args.request_template is not None
                    else None
                ),
                passthrough_behavior="NEVER",
                uri=f"arn:aws:apigateway:{Resource.Aws.region}:events:path//",
                credentials=args.execution_role_arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__responses = Responses(
            name=name,
            args=ResponsesArgs(
                status_codes=[200, 400, 403, 500, 503],
                rest_api_id=args.rest_api_id,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                cache_max_age=0,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__cors_route = CorsRoute(
            name=name,
            args=CorsRouteArgs(
                rest_api_id=args.rest_api_id,
                resource_id=self.__resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "resource": self.__resource.id,
                "method": self.__method.id,
                "integration": self.__integration.id,
            }
        )


class ResponsesArgs:
    def __init__(
        self,
        status_codes: List[int],
        rest_api_id: pulumi.Input[str],
        resource_id: pulumi.Input[str],
        http_method: pulumi.Input[str],
        cache_max_age: pulumi.Input[int],
    ):
        self.status_codes = status_codes
        self.rest_api_id = rest_api_id
        self.resource_id = resource_id
        self.http_method = http_method
        self.cache_max_age = cache_max_age


class Responses(pulumi.ComponentResource):
    def __init__(self, name: str, args: ResponsesArgs, opts: pulumi.ResourceOptions):
        super().__init__(
            t="pd:resource:Responses",
            name=f"{name}Responses",
            props=vars(args),
            opts=opts,
        )

        def is_ok(status_code: int):
            return 200 <= status_code <= 299

        self.__method_responses = [
            aws.apigateway.MethodResponse(
                resource_name=f"{name}MethodResponse{status_code}",
                args=aws.apigateway.MethodResponseArgs(
                    rest_api=args.rest_api_id,
                    resource_id=args.resource_id,
                    http_method=args.http_method,
                    status_code=str(status_code),
                    response_parameters=(
                        {
                            "method.response.header.Cache-Control": True,
                        }
                        if is_ok(status_code)
                        else None
                    ),
                ),
                opts=pulumi.ResourceOptions(parent=self),
            )
            for status_code in args.status_codes
        ]

        self.__integration_responses = [
            aws.apigateway.IntegrationResponse(
                f"{name}IntegrationResponse{status_code}",
                args=aws.apigateway.IntegrationResponseArgs(
                    rest_api=args.rest_api_id,
                    resource_id=args.resource_id,
                    http_method=args.http_method,
                    selection_pattern=str(status_code),
                    status_code=str(status_code),
                    response_parameters=(
                        {
                            "method.response.header.Cache-Control": pulumi.Output.format(
                                "'max-age={0}, public'", args.cache_max_age
                            )
                        }
                        if is_ok(status_code)
                        else None
                    ),
                ),
                opts=pulumi.ResourceOptions(parent=self),
            )
            for status_code in args.status_codes
        ]

        outputs: dict[str, pulumi.Output[str]] = {}
        for index, method_response in enumerate(self.__method_responses):
            outputs[f"method_response_{args.status_codes[index]}"] = method_response.id
        for index, integration_response in enumerate(self.__integration_responses):
            outputs[f"integration_response_{args.status_codes[index]}"] = (
                integration_response.id
            )

        self.register_outputs(outputs)


class CorsRouteArgs:
    def __init__(
        self,
        rest_api_id: pulumi.Input[str],
        resource_id: pulumi.Input[str],
    ):
        self.rest_api_id = rest_api_id
        self.resource_id = resource_id


class CorsRoute(pulumi.ComponentResource):
    def __init__(self, name: str, args: CorsRouteArgs, opts: pulumi.ResourceOptions):
        super().__init__(
            t="pd:resource:CorsRoute",
            name=f"{name}CorsRoute",
            props=vars(args),
            opts=opts,
        )

        self.__method = aws.apigateway.Method(
            resource_name=f"{name}CorsMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=args.rest_api_id,
                resource_id=args.resource_id,
                http_method="OPTIONS",
                authorization="NONE",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__method_response = aws.apigateway.MethodResponse(
            resource_name=f"{name}CorsMethodResponse",
            args=aws.apigateway.MethodResponseArgs(
                rest_api=args.rest_api_id,
                resource_id=args.resource_id,
                http_method=self.__method.http_method,
                status_code="204",
                response_parameters={
                    "method.response.header.Access-Control-Allow-Headers": True,
                    "method.response.header.Access-Control-Allow-Methods": True,
                    "method.response.header.Access-Control-Allow-Origin": True,
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration = aws.apigateway.Integration(
            resource_name=f"{name}CorsIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=args.rest_api_id,
                resource_id=args.resource_id,
                http_method=self.__method.http_method,
                type="MOCK",
                request_templates={"application/json": json.dumps({"statusCode": 200})},
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration_response = aws.apigateway.IntegrationResponse(
            resource_name=f"{name}CorsIntegrationResponse",
            args=aws.apigateway.IntegrationResponseArgs(
                rest_api=args.rest_api_id,
                resource_id=args.resource_id,
                http_method=self.__method.http_method,
                status_code=self.__method_response.status_code,
                response_parameters={
                    "method.response.header.Access-Control-Allow-Headers": "'*'",
                    "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                    "method.response.header.Access-Control-Allow-Origin": "'*'",
                },
            ),
            opts=pulumi.ResourceOptions(parent=self, depends_on=[self.__integration]),
        )

        self.register_outputs(
            {
                "method": self.__method.id,
                "method_response": self.__method_response.id,
                "integration": self.__integration.id,
                "integration_response": self.__integration_response.id,
            }
        )


class ApiDeploymentArgs:
    def __init__(
        self,
        tenant_id: str,
        domain_name_id: pulumi.Input[str],
        api: pulumi.Input[Api],
    ):
        self.tenant_id = tenant_id
        self.domain_name_id = domain_name_id
        self.api = api


class ApiDeployment(pulumi.ComponentResource):
    def __init__(
        self,
        args: ApiDeploymentArgs,
        opts: Optional[pulumi.ResourceOptions] = None,
    ):
        super().__init__(
            t="pd:resource:ApiDeployment",
            name="ApiDeployment",
            props=vars(args),
            opts=opts,
        )

        self.__deployment = aws.apigateway.Deployment(
            resource_name="ApiDeployment",
            args=aws.apigateway.DeploymentArgs(
                rest_api=args.api.rest_api.id,
                triggers={
                    # triggers redeploy on every execution
                    "datetime": datetime.now().isoformat()
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__log_group = aws.cloudwatch.LogGroup(
            resource_name="ApiLogGroup",
            args=aws.cloudwatch.LogGroupArgs(
                name=pulumi.Output.format(
                    "/aws/vendedlogs/apis/{0}",
                    args.api.rest_api.name,
                ),
                retention_in_days=14,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__stage = aws.apigateway.Stage(
            resource_name="ApiStage",
            args=aws.apigateway.StageArgs(
                rest_api=args.api.rest_api.id,
                stage_name=Resource.App.stage,
                deployment=self.__deployment.id,
                access_log_settings=aws.apigateway.StageAccessLogSettingsArgs(
                    destination_arn=self.__log_group.arn,
                    format=json.dumps(
                        {
                            # request info
                            "requestTime": "$context.requestTime",
                            "requestId": "$context.requestId",
                            "httpMethod": "$context.httpMethod",
                            "path": "$context.path",
                            "resourcePath": "$context.resourcePath",
                            "status": "$context.status",
                            "responseLatency": "$context.responseLatency",
                            "xrayTraceId": "$context.xrayTraceId",
                            # integration info
                            "functionResponseStatus": "$context.integration.status",
                            "integrationRequestId": "$context.integration.requestId",
                            "integrationLatency": "$context.integration.latency",
                            "integrationServiceStatus": "$context.integration.integrationStatus",
                            # caller info
                            "ip": "$context.identity.sourceIp",
                            "userAgent": "$context.identity.userAgent",
                            "principalId": "$context.authorizer.principalId",
                        }
                    ),
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__base_path_mapping = aws.apigateway.BasePathMapping(
            resource_name="ApiBasePathMapping",
            args=aws.apigateway.BasePathMappingArgs(
                rest_api=args.api.rest_api.id,
                domain_name=args.domain_name_id,
                stage_name=self.__stage.stage_name,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "deployment": self.__deployment.id,
                "log_group": self.__log_group.id,
                "stage": self.__stage.id,
                "base_path_mapping": self.__base_path_mapping.id,
            }
        )
