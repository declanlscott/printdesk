import pulumi
import pulumi_aws as aws

from utilities import tags, region, account_id, build_name, resource

from typing import Optional


class PapercutSecureReverseProxyArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class PapercutSecureReverseProxy(pulumi.ComponentResource):
    def __init__(
        self,
        args: PapercutSecureReverseProxyArgs,
        opts: Optional[pulumi.ResourceOptions] = None,
    ):
        super().__init__(
            t="pd:resource:PapercutSecureReverseProxy",
            name="PapercutSecureReverseProxy",
            props=vars(args),
            opts=opts,
        )

        self.__role = aws.iam.Role(
            resource_name="PapercutSecureReverseProxyRole",
            args=aws.iam.RoleArgs(
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="Service",
                                    identifiers=["lambda.amazonaws.com"],
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).minified_json,
                managed_policy_arns=[
                    aws.iam.ManagedPolicy.AWS_LAMBDA_BASIC_EXECUTION_ROLE
                ],
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__role_policy: pulumi.Output[
            aws.iam.RolePolicy
        ] = aws.kms.get_alias_output(name="alias/aws/ssm").target_key_arn.apply(
            lambda key_arn: aws.iam.RolePolicy(
                resource_name="PapercutSecureReverseProxyRolePolicy",
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
                                                "tailnetPapercutServerUri"
                                            ]["nameTemplate"],
                                            args.tenant_id,
                                        ),
                                        build_name(
                                            resource["Aws"]["tenant"]["parameters"][
                                                "tailscaleOauthClient"
                                            ]["nameTemplate"],
                                            args.tenant_id,
                                        ),
                                    ]
                                ],
                            ),
                            aws.iam.GetPolicyDocumentStatementArgs(
                                actions=["kms:Decrypt"],
                                resources=[key_arn],
                            ),
                        ]
                    ).minified_json,
                ),
                opts=pulumi.ResourceOptions(parent=self),
            )
        )

        self.__function = aws.lambda_.Function(
            resource_name="PapercutSecureReverseProxyFunction",
            args=aws.lambda_.FunctionArgs(
                s3_bucket=resource["Code"]["bucket"]["name"],
                s3_key=resource["Code"]["bucket"]["object"][
                    "papercutSecureReverseProxy"
                ]["key"],
                s3_object_version=resource["Code"]["bucket"]["object"][
                    "papercutSecureReverseProxy"
                ]["versionId"],
                runtime=aws.lambda_.Runtime.CUSTOM_AL2023,
                handler="bootstrap",
                architectures=["arm64"],
                timeout=20,
                role=self.__role.arn,
                environment=aws.lambda_.FunctionEnvironmentArgs(
                    variables={
                        "TARGET_PARAM_NAME": build_name(
                            resource["Aws"]["tenant"]["parameters"][
                                "tailnetPapercutServerUri"
                            ]["nameTemplate"],
                            args.tenant_id,
                        ),
                        "TS_OAUTH_CLIENT_PARAM_NAME": build_name(
                            resource["Aws"]["tenant"]["parameters"][
                                "tailscaleOauthClient"
                            ]["nameTemplate"],
                            args.tenant_id,
                        ),
                    }
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "role": self.__role.id,
                "role_policy": self.__role_policy.apply(lambda policy: policy.id),
                "function": self.__function.id,
            }
        )

    @property
    def function_name(self):
        return self.__function.name

    @property
    def function_arn(self):
        return self.__function.arn

    @property
    def invoke_arn(self):
        return self.__function.invoke_arn
