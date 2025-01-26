from dataclasses import dataclass
from typing import TypedDict, Union

import pulumi
import pulumi_aws as aws

from utilities import tags, retain_on_delete, resource
from utilities.aws import build_name


class _BucketArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class _Bucket(pulumi.ComponentResource):
    def __init__(
        self, name: str, args: _BucketArgs, opts: pulumi.ResourceOptions = None
    ):
        super().__init__(
            t="pw:resource:StorageBucket", name=name, props=vars(args), opts=opts
        )

        self.__bucket = aws.s3.BucketV2(
            resource_name=f"{name}Bucket",
            args=aws.s3.BucketV2Args(force_destroy=True, tags=tags(args.tenant_id)),
            opts=pulumi.ResourceOptions(parent=self, retain_on_delete=retain_on_delete),
        )

        self.__public_access_block = aws.s3.BucketAccessBlock(
            resource_name=f"{name}PublicAccessBlock",
            args=aws.s3.BucketPublicAccessBlockArgs(
                bucket=self.__bucket.bucket,
                block_public_acls=True,
                block_public_policy=True,
                ignore_public_acls=True,
                restrict_public_buckets=True,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__policy = aws.s3.BucketPolicy(
            resource_name=f"{name}Policy",
            args=aws.s3.BucketPolicyArgs(
                bucket=self.__bucket.bucket,
                policy=pulumi.Output.json_dumps(
                    aws.iam.get_policy_document_output(
                        statements=[
                            aws.iam.GetPolicyDocumentStatementArgs(
                                principals=[
                                    aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                        type="Service",
                                        identifiers=["cloudfront.amazonaws.com"],
                                    )
                                ],
                                actions=["s3:GetObject"],
                                resources=[
                                    pulumi.Output.format("{0}/*", self.__bucket.arn)
                                ],
                            ),
                            aws.iam.GetPolicyDocumentStatementArgs(
                                effect="Deny",
                                principals=[
                                    aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                        type="*", identifiers=["*"]
                                    )
                                ],
                                actions=["s3:*"],
                                resources=[
                                    self.__bucket.arn,
                                    pulumi.Output.format("{0}/*", self.__bucket.arn),
                                ],
                                conditions=[
                                    aws.iam.GetPolicyDocumentStatementConditionArgs(
                                        test="Bool",
                                        variable="aws:SecureTransport",
                                        values=["false"],
                                    )
                                ],
                            ),
                        ]
                    )
                ),
            ),
            opts=pulumi.ResourceOptions(
                parent=self, depends_on=self.__public_access_block
            ),
        )

        self.__cors = aws.s3.BucketCorsConfigurationV2(
            resource_name=f"{name}Cors",
            args=aws.s3.BucketCorsConfigurationV2Args(
                bucket=self.__bucket.bucket,
                cors_rules=[
                    aws.s3.BucketCorsConfigurationV2CorsRuleArgs(
                        allowed_headers=["*"],
                        allowed_origins=["*"],
                        allowed_methods=["DELETE", "GET", "HEAD", "POST", "PUT"],
                        max_age=0,
                    ),
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "bucket": self.__bucket.id,
                "public_access_block": self.__public_access_block.id,
                "policy": self.__policy.id,
                "cors": self.__cors.id,
            }
        )

    @property
    def regional_domain_name(self):
        return self.__bucket.bucket_regional_domain_name

    @property
    def name(self):
        return self.__bucket.bucket

    @property
    def arn(self):
        return self.__bucket.arn


class Buckets(TypedDict):
    assets: _Bucket
    documents: _Bucket


@dataclass
class DisabledFifo:
    enabled: False


@dataclass
class EnabledFifo:
    enabled: True
    deduplication: bool


class _QueueArgs:
    def __init__(
        self,
        tenant_id: str,
        with_dlq: bool,
        fifo: Union[DisabledFifo, EnabledFifo],
    ):
        self.tenant_id = tenant_id
        self.with_dlq = with_dlq
        self.fifo = fifo


class _Queue(pulumi.ComponentResource):
    def __init__(
        self, name: str, args: _QueueArgs, opts: pulumi.ResourceOptions = None
    ):
        super().__init__(
            t="pw:resource:StorageQueue", name=f"{name}Queue", props=vars(args), opts=opts
        )

        if args.with_dlq:
            self.__dlq = aws.sqs.Queue(
                resource_name=f"{name}Dlq",
                args=aws.sqs.QueueArgs(tags=tags(args.tenant_id)),
                opts=pulumi.ResourceOptions(
                    parent=self, retain_on_delete=retain_on_delete
                ),
            )

        self.__queue = aws.sqs.Queue(
            resource_name=f"{name}Queue",
            args=aws.sqs.QueueArgs(
                fifo_queue=args.fifo.enabled,
                content_based_deduplication=(
                    args.fifo.deduplication if args.fifo.enabled else None
                ),
                visibility_timeout_seconds=30,
                redrive_policy=(
                    pulumi.Output.json_dumps(
                        {"deadLetterTargetArn": self.__dlq.arn, "maxReceiveCount": 3}
                    )
                    if args.with_dlq and hasattr(self, "_Queue__dlq")
                    else None
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self, retain_on_delete=retain_on_delete),
        )

        self.register_outputs(
            {
                "dlq": self.__dlq.id if hasattr(self, "_Queue__dlq") else None,
                "queue": self.__queue.id,
            }
        )

    @property
    def arn(self):
        return self.__queue.arn

    @property
    def name(self):
        return self.__queue.name

    @property
    def url(self):
        return self.__queue.url


class Queues(TypedDict):
    invoices_processor: _Queue


class StorageArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Storage(pulumi.ComponentResource):
    def __init__(self, args: StorageArgs, opts: pulumi.ResourceOptions = None):
        super().__init__(
            t="pw:resource:Storage", name="Storage", props=vars(args), opts=opts
        )

        self.__buckets: Buckets = {
            "assets": _Bucket(
                name="Assets",
                args=_BucketArgs(tenant_id=args.tenant_id),
                opts=pulumi.ResourceOptions(parent=self),
            ),
            "documents": _Bucket(
                name="Documents",
                args=_BucketArgs(tenant_id=args.tenant_id),
                opts=pulumi.ResourceOptions(parent=self),
            ),
        }

        self.__queues: Queues = {
            "invoices_processor": _Queue(
                name="InvoicesProcessor",
                args=_QueueArgs(
                    tenant_id=args.tenant_id,
                    with_dlq=True,
                    fifo=EnabledFifo(enabled=True, deduplication=True),
                ),
                opts=pulumi.ResourceOptions(parent=self),
            )
        }

        assume_role_policy = pulumi.Output.json_dumps(
            aws.iam.get_policy_document_output(
                statements=[
                    aws.iam.GetPolicyDocumentStatementArgs(
                        principals=[
                            aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                type="AWS",
                                identifiers=[resource["ApiFunction"]["roleArn"]],
                            )
                        ],
                        actions=["sts:AssumeRole"],
                    )
                ]
            )
        )

        self.__buckets_access_role = aws.iam.Role(
            resource_name="BucketsAccessRole",
            args=aws.iam.RoleArgs(
                name=build_name(
                    name_template=resource["Aws"]["tenant"]["roles"]["bucketsAccess"][
                        "nameTemplate"
                    ],
                    tenant_id=args.tenant_id,
                ),
                assume_role_policy=assume_role_policy,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__buckets_access_role_policy = aws.iam.RolePolicy(
            resource_name="BucketsAccessRolePolicy",
            args=aws.iam.RolePolicyArgs(
                role=self.__buckets_access_role.name,
                policy=pulumi.Output.json_dumps(
                    aws.iam.get_policy_document_output(
                        statements=[
                            aws.iam.GetPolicyDocumentStatementArgs(
                                actions=["s3:GetObject", "s3:PutObject"],
                                resources=[
                                    pulumi.Output.format(
                                        "{0}/*", self.__buckets["assets"].arn
                                    ),
                                    pulumi.Output.format(
                                        "{0}/*", self.__buckets["documents"].arn
                                    ),
                                ],
                            )
                        ]
                    )
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__put_parameters_role = aws.iam.Role(
            resource_name="PutParametersRole",
            args=aws.iam.RoleArgs(
                name=build_name(
                    name_template=resource["Aws"]["tenant"]["roles"]["putParameters"][
                        "nameTemplate"
                    ],
                    tenant_id=args.tenant_id,
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__put_parameters_role_policy = aws.iam.RolePolicy(
            resource_name="PutParametersRolePolicy",
            args=aws.iam.RolePolicyArgs(
                role=self.__put_parameters_role.name,
                policy=pulumi.Output.json_dumps(
                    aws.iam.get_policy_document_output(
                        statements=[
                            aws.iam.GetPolicyDocumentStatementArgs(
                                actions=["ssm:PutParameter"],
                                resources=[
                                    f"arn:aws:ssm:{resource["Aws"]["accountId"]}:parameter{name}"
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
                                                "tailnetPapercutServerUri"
                                            ]["nameTemplate"],
                                            args.tenant_id,
                                        ),
                                        build_name(
                                            resource["Aws"]["tenant"]["parameters"][
                                                "papercutServerAuthToken"
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
                            )
                        ]
                    )
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "buckets_access_role": self.__buckets_access_role.id,
                "buckets_access_role_policy": self.__buckets_access_role_policy.id,
                "put_parameters_role": self.__put_parameters_role.id,
                "put_parameters_role_policy": self.__put_parameters_role_policy.id,
            }
        )

    @property
    def buckets(self):
        return self.__buckets

    @property
    def queues(self):
        return self.__queues
