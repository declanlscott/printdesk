from typing import Optional

import pulumi
import pulumi_aws as aws
from sst import Resource

from utils import tags, naming, is_prod_stage


class StorageArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Storage(pulumi.ComponentResource):
    def __init__(self, args: StorageArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Storage",
            name="Storage",
            props=vars(args),
            opts=opts
        )

        self.__assets_bucket = _Bucket(
            resource_name="Assets",
            args=_BucketArgs(
                tenant_id=args.tenant_id,
                name=naming.template(
                    name_template=Resource.TenantBuckets.assets.nameTemplate,
                    tenant_id=args.tenant_id,
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__documents_bucket = _Bucket(
            resource_name="Documents",
            args=_BucketArgs(
                tenant_id=args.tenant_id,
                name=naming.template(
                    name_template=Resource.TenantBuckets.documents.nameTemplate,
                    tenant_id=args.tenant_id,
                )
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__invoices_processor_queue = _Queue(
            resource_name="InvoicesProcessor",
            args=_QueueArgs(
                tenant_id=args.tenant_id,
                with_dlq=True,
                fifo=_FifoQueueArg(
                    enabled=True,
                    deduplication=True,
                )
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__buckets_access_role = aws.iam.Role(
            resource_name="BucketsAccessRole",
            args=aws.iam.RoleArgs(
                name=naming.template(
                    name_template=Resource.TenantRoles.bucketsAccess.nameTemplate,
                    tenant_id=args.tenant_id,
                ),
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS",
                                    identifiers=[Resource.Api.roleArn],
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).json,
                inline_policies=[
                    aws.iam.get_policy_document_output(
                        statements=pulumi.Output.all(
                            self.__assets_bucket.arn,
                            self.__documents_bucket.arn,
                        ).apply(
                            lambda arns: [
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["s3:GetObject", "s3:PutObject"],
                                    resources=[f"{arns[0]}/*", f"{arns[1]}/*"],
                                )
                            ]
                        )
                    ).json
                ],
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "buckets_access_role": self.__buckets_access_role.id,
            }
        )

    @property
    def assets_bucket(self):
        return self.__assets_bucket

    @property
    def documents_bucket(self):
        return self.__documents_bucket

    @property
    def invoices_processor_queue(self):
        return self.__invoices_processor_queue


class _BucketArgs:
    def __init__(self, tenant_id: str, name: pulumi.Input[str]):
        self.tenant_id = tenant_id
        self.name = name


class _Bucket(pulumi.ComponentResource):
    def __init__(self, resource_name: str, args: _BucketArgs, opts: Optional[pulumi.ResourceOptions]):
        super().__init__(
            t="pd:resource:_Bucket",
            name=f"{resource_name}_Bucket",
            props=vars(args),
            opts=opts,
        )

        self.__bucket = aws.s3.BucketV2(
            resource_name=f"{resource_name}Bucket",
            args=aws.s3.BucketV2Args(
                bucket=args.name,
                force_destroy=True,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__public_access_block = aws.s3.BucketPublicAccessBlockArgs(
            resource_name=f"{resource_name}PublicAccessBlock",
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
            resource_name=f"{resource_name}BucketPolicy",
            args=aws.s3.BucketPolicyArgs(
                bucket=self.__bucket.bucket,
                policy=aws.iam.get_policy_document_output(
                    statements=self.__bucket.arn.apply(
                        lambda bucket_arn: [
                            aws.iam.GetPolicyDocumentStatementArgs(
                                principals=[
                                    aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                        type="Service",
                                        identifiers=["cloudfront.amazonaws.com"],
                                    ),
                                ],
                                actions=["s3:GetObject"],
                                resources=[f"{bucket_arn}/*"],
                            ),
                            aws.iam.GetPolicyDocumentStatementArgs(
                                effect="Deny",
                                principals=[
                                    aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                        type="*",
                                        identifiers=["*"],
                                    )
                                ],
                                actions=["s3:*"],
                                resources=[bucket_arn, f"{bucket_arn}/*"],
                                conditions=[
                                    aws.iam.GetPolicyDocumentStatementConditionArgs(
                                        test="Bool",
                                        variable="aws:SecureTransport",
                                        values=["false"],
                                    )
                                ]
                            ),
                        ]
                    )
                ).json,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                depends_on=[self.__public_access_block],
            ),
        )

        self.__cors = aws.s3.BucketCorsConfigurationV2(
            resource_name=f"{resource_name}Cors",
            args=aws.s3.BucketCorsConfigurationV2Args(
                bucket=self.__bucket.bucket,
                cors_rules=[
                    aws.s3.BucketCorsConfigurationV2CorsRuleArgs(
                        allowed_headers=["*"],
                        allowed_origins=["*"],
                        allowed_methods=["DELETE", "GET", "HEAD", "POST", "PUT"],
                        max_age_seconds=0,
                    )
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


class _FifoQueueArg:
    def __init__(self, enabled: pulumi.Input[bool], deduplication: pulumi.Input[bool]):
        self.enabled = enabled
        self.deduplication = deduplication


class _QueueArgs:
    def __init__(
        self,
        tenant_id: str,
        with_dlq: pulumi.Input[bool],
        fifo: pulumi.Input[_FifoQueueArg]

    ):
        self.tenant_id = tenant_id
        self.with_dlq = with_dlq
        self.fifo = fifo


class _Queue(pulumi.ComponentResource):
    def __init__(self, resource_name: str, args: _QueueArgs, opts: pulumi.ResourceOptions):
        super().__init__(
            t="pd:resource:_Queue",
            name=f"{resource_name}_Queue",
            props=vars(args),
            opts=opts,
        )

        if args.with_dlq:
            self.__dlq = aws.sqs.Queue(
                resource_name=f"{resource_name}DeadLetterQueue",
                args=aws.sqs.QueueArgs(
                    fifo_queue=args.fifo.enabled,
                    content_based_deduplication=(
                        args.fifo.deduplication if args.fifo.enabled else None
                    ),
                    tags=tags(args.tenant_id),
                ),
                opts=pulumi.ResourceOptions(
                    parent=self,
                    retain_on_delete=is_prod_stage,
                ),
            )

        self.__queue = aws.sqs.Queue(
            resource_name=f"{resource_name}Queue",
            args=aws.sqs.QueueArgs(
                fifo_queue=args.fifo.enabled,
                content_based_deduplication=(
                    args.fifo.deduplication if args.fifo.enabled else None
                ),
                visibility_timeout_seconds=30,
                redrive_policy=(
                    pulumi.Output.json_dumps(
                        {
                            "deadLetterTargetArn": self.__dlq.arn,
                            "maxReceiveCount": 3
                        }
                        if args.with_dlq and hasattr(self, "_Queue__dlq")
                        else None
                    )
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=is_prod_stage,
            ),
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

