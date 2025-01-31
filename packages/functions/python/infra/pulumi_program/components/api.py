import pulumi
import pulumi_aws as aws

from utilities import tags, region, resource, account_id, build_name, reverse_dns

from typing import Optional, Mapping, List


class ApiArgs:
    def __init__(
        self,
        tenant_id: str,
        gateway: pulumi.Input[aws.apigateway.RestApi],
        invoices_processor_queue_arn: pulumi.Input[str],
        distribution_id: pulumi.Input[str],
        domain_name: pulumi.Input[str],
        appsync_http_domain_name: pulumi.Input[str],
        appsync_realtime_domain_name: pulumi.Input[str],
        papercut_secure_reverse_proxy_function_invoke_arn: pulumi.Input[str],
    ):
        self.tenant_id = tenant_id
        self.gateway = gateway
        self.invoices_processor_queue_arn = invoices_processor_queue_arn
        self.distribution_id = distribution_id
        self.domain_name = domain_name
        self.appsync_http_domain_name = appsync_http_domain_name
        self.appsync_realtime_domain_name = appsync_realtime_domain_name
        self.papercut_secure_reverse_proxy_function_invoke_arn = (
            papercut_secure_reverse_proxy_function_invoke_arn
        )


class Api(pulumi.ComponentResource):
    def __init__(self, args: ApiArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(t="pw:resource:Api", name="Api", props=vars(args), opts=opts)

        self.__gateway = args.gateway

        self.__role = aws.iam.Role(
            resource_name="ApiRole",
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

        self.__role_policy: pulumi.Output[aws.iam.RolePolicy] = pulumi.Output.all(
            aws.kms.get_alias_output(name="alias/aws/ssm").target_key_arn,
            aws.cloudwatch.get_event_bus_output(name="default").arn,
            args.invoices_processor_queue_arn,
            aws.cloudfront.get_distribution_output(id=args.distribution_id).arn,
        ).apply(
            lambda arns: aws.iam.RolePolicy(
                resource_name="ApiRolePolicy",
                args=aws.iam.RolePolicyArgs(
                    role=self.__role.name,
                    policy=aws.iam.get_policy_document_output(
                        statements=[
                            aws.iam.GetPolicyDocumentStatementArgs(
                                actions=["ssm:GetParameter"],
                                resources=[
                                    f"arn:aws:ssm:{region}:{account_id}:parameter{name}"
                                    for name in [
                                        build_name(
                                            resource["Aws"]["tenant"]["parameters"][
                                                "documentsMimeTypes"
                                            ]["nameTemplate"],
                                            args.tenant_id,
                                        ),
                                        build_name(
                                            resource["Aws"]["tenant"]["parameters"][
                                                "documentsSizeLimit"
                                            ]["nameTemplate"],
                                            args.tenant_id,
                                        ),
                                        build_name(
                                            resource["Aws"]["tenant"]["parameters"][
                                                "papercutServerAuthToken"
                                            ]["nameTemplate"],
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

        self.__api_policy: pulumi.Output[aws.apigateway.RestApiPolicy] = (
            self.__gateway.execution_arn.apply(
                lambda execution_arn: aws.apigateway.RestApiPolicy(
                    resource_name="ApiPolicy",
                    args=aws.apigateway.RestApiPolicyArgs(
                        rest_api_id=self.__gateway.id,
                        policy=aws.iam.get_policy_document_output(
                            statements=[
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    principals=[
                                        aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                            type="AWS",
                                            identifiers=[
                                                resource["ApiFunction"]["roleArn"],
                                                resource["PapercutSync"]["roleArn"],
                                            ],
                                        )
                                    ],
                                    actions=["execute-api:Invoke"],
                                    resources=[f"{execution_arn}/*"],
                                )
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
                rest_api=self.__gateway.id,
                parent_id=self.__gateway.root_resource_id,
                path_part="health",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_method = aws.apigateway.Method(
            resource_name="ApiHealthMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__health_resource.id,
                http_method="GET",
                authorization="NONE",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_integration = aws.apigateway.Integration(
            resource_name="ApiHealthIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__health_resource.id,
                http_method=self.__health_method.http_method,
                type="MOCK",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_method_response = aws.apigateway.MethodResponse(
            resource_name="ApiHealthMethodResponse",
            args=aws.apigateway.MethodResponseArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__health_resource.id,
                http_method=self.__health_method.http_method,
                status_code="200",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_integration_response = aws.apigateway.IntegrationResponse(
            resource_name="ApiHealthIntegrationResponse",
            args=aws.apigateway.IntegrationResponseArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__health_resource.id,
                http_method=self.__health_method.http_method,
                status_code=self.__health_method_response.status_code,
                response_templates={"text/plain": "OK"},
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__health_cors_route = CorsRoute(
            name="ApiHealth",
            args=CorsRouteArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__health_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__well_known_resource = aws.apigateway.Resource(
            resource_name="ApiWellKnownResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__gateway.root_resource_id,
                path_part=".well-known",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__app_specific_resource = aws.apigateway.Resource(
            resource_name="ApiWellKnownAppSpecificResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__well_known_resource.id,
                path_part="appspecific",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        app_specific_base_path: pulumi.Output[str] = pulumi.Output.from_input(
            args.domain_name
        ).apply(reverse_dns)

        self.__appsync_events_domain_names_route = WellKnownAppSpecificRoute(
            name="ApiAppsyncEventsDomainNames",
            args=WellKnownAppSpecificRouteArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__app_specific_resource.id,
                path_part=pulumi.Output.format(
                    "{0}.appsync-events-domain-names.json", app_specific_base_path
                ),
                response_templates={
                    "application/json": pulumi.Output.json_dumps(
                        {
                            "http": args.appsync_http_domain_name,
                            "realtime": args.appsync_realtime_domain_name,
                        }
                    )
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_resource = aws.apigateway.Resource(
            resource_name="ApiParametersResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__gateway.root_resource_id,
                path_part="parameters",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_resource = aws.apigateway.Resource(
            resource_name="ApiParametersProxyResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__parameters_resource.id,
                path_part="{proxy+}",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_method = aws.apigateway.Method(
            resource_name="ApiParametersProxyMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__parameters_proxy_resource.id,
                http_method="GET",
                authorization="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_integration = aws.apigateway.Integration(
            resource_name="ApiParametersProxyIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__parameters_proxy_resource.id,
                http_method=self.__parameters_proxy_method.http_method,
                type="AWS",
                integration_http_method="POST",
                request_parameters={
                    "integration.request.header.Content-Type": "'application/x-amz-json-1.1'",
                    "integration.request.header.X-Amz-Target": "'AmazonSSM.GetParameter'",
                },
                request_templates={
                    "application/json": """
                        {
                          "Name": "$util.escapeJavaScript($input.params().path.get('proxy'))"
                          #if($util.escapeJavaScript($input.params().query.get('withDecryption')) == 'true')
                          ,"WithDecryption": true
                          #end
                        }
                        """
                },
                passthrough_behavior="NEVER",
                uri=f"arn:aws:apigateway:{region}:ssm:path//",
                credentials=self.__role.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__parameters_proxy_responses = Responses(
            name="ApiParametersProxy",
            args=ResponsesArgs(
                status_codes=[200, 400, 403, 500, 503],
                rest_api=self.__gateway.id,
                resource_id=self.__parameters_proxy_resource.id,
                http_method=self.__parameters_proxy_method.http_method,
            ),
            opts=pulumi.ResourceOptions(
                parent=self, depends_on=[self.__parameters_proxy_integration]
            ),
        )

        self.__parameters_proxy_cors_route = CorsRoute(
            name="ApiParametersProxy",
            args=CorsRouteArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__parameters_proxy_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_resource = aws.apigateway.Resource(
            resource_name="ApiPapercutResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__gateway.root_resource_id,
                path_part="papercut",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_resource = aws.apigateway.Resource(
            resource_name="ApiPapercutServerResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__papercut_resource.id,
                path_part="server",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_resource = aws.apigateway.Resource(
            resource_name="ApiPapercutServerProxyResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=self.__gateway.id,
                parent_id=self.__papercut_server_resource.id,
                path_part="{proxy+}",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_method = aws.apigateway.Method(
            resource_name="ApiPapercutServerProxyMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__papercut_server_proxy_resource.id,
                http_method="ANY",
                authorization="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_integration = aws.apigateway.Integration(
            resource_name="ApiPapercutServerProxyIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__papercut_server_proxy_resource.id,
                http_method=self.__papercut_server_proxy_method.http_method,
                type="AWS_PROXY",
                integration_http_method="POST",
                passthrough_behavior="WHEN_NO_TEMPLATES",
                uri=args.papercut_secure_reverse_proxy_function_invoke_arn,
                credentials=self.__role.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_server_proxy_cors_route = CorsRoute(
            name="ApiPapercutServerProxy",
            args=CorsRouteArgs(
                rest_api=self.__gateway.id,
                resource_id=self.__papercut_server_proxy_resource.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__cors_response_4xx = aws.apigateway.Response(
            resource_name="ApiCorsResponse4xx",
            args=aws.apigateway.ResponseArgs(
                rest_api_id=self.__gateway.id,
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
                rest_api_id=self.__gateway.id,
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

        triggers = pulumi.Output.all(
            self.__gateway,
            self.__health_resource,
            self.__health_method,
            self.__health_method_response,
            self.__health_integration,
            self.__health_method_response,
            *self.__health_cors_route.triggers,
            self.__well_known_resource,
            self.__app_specific_resource,
            *self.__appsync_events_domain_names_route.triggers,
            self.__parameters_resource,
            self.__parameters_proxy_resource,
            self.__parameters_proxy_method,
            self.__parameters_proxy_integration,
            *self.__parameters_proxy_responses.triggers,
            *self.__parameters_proxy_cors_route.triggers,
            self.__papercut_resource,
            self.__papercut_server_resource,
            self.__papercut_server_proxy_resource,
            self.__papercut_server_proxy_method,
            self.__papercut_server_proxy_integration,
            self.__papercut_server_proxy_cors_route.triggers,
            self.__cors_response_4xx,
            self.__cors_response_5xx,
        )

        self.register_outputs(
            {
                "role": self.__role.id,
                "role_policy": self.__role_policy.apply(lambda policy: policy.id),
                "api_policy": self.__api_policy.apply(lambda policy: policy.id),
                "health_resource": self.__health_resource.id,
                "health_method": self.__health_method.id,
                "health_integration": self.__health_integration.id,
                "health_method_response": self.__health_method_response.id,
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
                "cors_response_4xx": self.__cors_response_4xx.id,
                "cors_response_5xx": self.__cors_response_5xx.id,
            }
        )


class WellKnownAppSpecificRouteArgs:
    def __init__(
        self,
        rest_api: pulumi.Input[str],
        parent_id: pulumi.Input[str],
        path_part: pulumi.Input[str],
        response_templates: pulumi.Input[Mapping[str, pulumi.Input[str]]],
    ):
        self.rest_api = rest_api
        self.parent_id = parent_id
        self.path_part = path_part
        self.response_templates = response_templates


class WellKnownAppSpecificRoute(pulumi.ComponentResource):
    def __init__(
        self,
        name: str,
        args: WellKnownAppSpecificRouteArgs,
        opts: pulumi.ResourceOptions,
    ):
        super().__init__(
            t="pw:resource:WellKnownAppSpecificRoute",
            name=f"{name}WellKnownAppSpecificRoute",
            props=vars(args),
            opts=opts,
        )

        self.__resource = aws.apigateway.Resource(
            resource_name=f"{name}WellKnownAppSpecificResource",
            args=aws.apigateway.ResourceArgs(
                rest_api=args.rest_api,
                parent_id=args.parent_id,
                path_part=args.path_part,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__method = aws.apigateway.Method(
            resource_name=f"{name}WellKnownAppSpecificMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=self.__resource.rest_api,
                resource_id=self.__resource.id,
                http_method="GET",
                authorization="AWS_IAM",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__method_response = aws.apigateway.MethodResponse(
            resource_name=f"{name}WellKnownAppSpecificMethodResponse",
            args=aws.apigateway.MethodResponseArgs(
                rest_api=args.rest_api,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                status_code="200",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration = aws.apigateway.Integration(
            resource_name=f"{name}WellKnownAppSpecificIntegration",
            args=aws.apigateway.IntegrationArgs(
                rest_api=args.rest_api,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                type="MOCK",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration_response = aws.apigateway.IntegrationResponse(
            resource_name=f"{name}WellKnownAppSpecificIntegrationResponse",
            args=aws.apigateway.IntegrationResponseArgs(
                rest_api=self.__resource.rest_api,
                resource_id=self.__resource.id,
                http_method=self.__method.http_method,
                status_code=self.__method_response.status_code,
                response_templates=args.response_templates,
            ),
            opts=pulumi.ResourceOptions(parent=self, depends_on=[self.__integration]),
        )

        self.__cors_route = CorsRoute(
            name=f"{name}WellKnownAppSpecific",
            args=CorsRouteArgs(
                rest_api=args.rest_api,
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

    @property
    def triggers(self):
        return [
            self.__resource,
            self.__method,
            self.__method_response,
            self.__integration,
            self.__integration_response,
            *self.__cors_route.triggers,
        ]


class ResponsesArgs:
    def __init__(
        self,
        status_codes: List[int],
        rest_api: pulumi.Input[str],
        resource_id: pulumi.Input[str],
        http_method: pulumi.Input[str],
    ):
        self.status_codes = status_codes
        self.rest_api = rest_api
        self.resource_id = resource_id
        self.http_method = http_method


class Responses(pulumi.ComponentResource):
    def __init__(self, name: str, args: ResponsesArgs, opts: pulumi.ResourceOptions):
        super().__init__(
            t="pw:resource:Responses",
            name=f"{name}Responses",
            props=vars(args),
            opts=opts,
        )

        self.__method_responses = [
            aws.apigateway.MethodResponse(
                resource_name=f"{name}MethodResponse{status_code}",
                args=aws.apigateway.MethodResponseArgs(
                    rest_api=args.rest_api,
                    resource_id=args.resource_id,
                    http_method=args.http_method,
                    status_code=str(status_code),
                ),
                opts=pulumi.ResourceOptions(parent=self),
            )
            for status_code in args.status_codes
        ]

        self.__integration_responses = [
            aws.apigateway.IntegrationResponse(
                f"{name}IntegrationResponse{status_code}",
                args=aws.apigateway.IntegrationResponseArgs(
                    rest_api=args.rest_api,
                    resource_id=args.resource_id,
                    http_method=args.http_method,
                    selection_pattern=str(status_code),
                    status_code=str(status_code),
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

    @property
    def triggers(self):
        return [
            *self.__method_responses,
            *self.__integration_responses,
        ]


class CorsRouteArgs:
    def __init__(self, rest_api: pulumi.Input[str], resource_id: pulumi.Input[str]):
        self.rest_api = rest_api
        self.resource_id = resource_id


class CorsRoute(pulumi.ComponentResource):
    def __init__(self, name: str, args: CorsRouteArgs, opts: pulumi.ResourceOptions):
        super().__init__(
            t="pw:resource:CorsRoute",
            name=f"{name}CorsRoute",
            props=vars(args),
            opts=opts,
        )

        self.__method = aws.apigateway.Method(
            resource_name=f"{name}CorsMethod",
            args=aws.apigateway.MethodArgs(
                rest_api=args.rest_api,
                resource_id=args.resource_id,
                http_method="OPTIONS",
                authorization="NONE",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__method_response = aws.apigateway.MethodResponse(
            resource_name=f"{name}CorsMethodResponse",
            args=aws.apigateway.MethodResponseArgs(
                rest_api=args.rest_api,
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
                rest_api=args.rest_api,
                resource_id=args.resource_id,
                http_method=self.__method.http_method,
                type="MOCK",
                request_templates={
                    "application/json": pulumi.Output.json_dumps({"statusCode": 200})
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__integration_response = aws.apigateway.IntegrationResponse(
            resource_name=f"{name}CorsIntegrationResponse",
            args=aws.apigateway.IntegrationResponseArgs(
                rest_api=args.rest_api,
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

    @property
    def triggers(self):
        return [
            self.__method,
            self.__integration,
            self.__integration_response,
            self.__method_response,
        ]
