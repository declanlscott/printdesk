from dataclasses import dataclass
from typing import Optional

import pulumi
import pulumi_aws as aws
from sst import Resource

from utils import naming
from program.components.assets.route import Route, RouteArgs


@dataclass
class AssetsArgs:
    tenant_id: pulumi.Input[str]


class Assets(pulumi.ComponentResource):
    def __init__(self, args: AssetsArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:aws:Assets",
            name="Assets",
            props=vars(args),
            opts=opts,
        )

        name: pulumi.Output[str] = pulumi.Output.from_input(args.tenant_id).apply(
            lambda tenant_id: naming.template(
                name_template=Resource.AssetsBucketAccessPointTemplate.name,
                tenant_id=tenant_id,
            )
        )

        resource = pulumi.Output.format(
            "arn:aws:s3:{0}:{1}:accesspoint/{2}/object/{3}",
            Resource.Aws.region,
            Resource.Aws.account.id,
            name,
            pulumi.Output.from_input(args.tenant_id),
        )

        self._access_point = aws.s3.AccessPoint(
            resource_name="AssetsAccessPoint",
            args=aws.s3.AccessPointArgs(
                bucket=Resource.AssetsBucket.name,
                name=name,
                policy=aws.iam.get_policy_document_output(
                    statements=resource.apply(
                        lambda resource: [
                            aws.iam.GetPolicyDocumentStatementArgs(
                                principals=[
                                    aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                        type="AWS",
                                        identifiers=[Resource.Api.roleArn],
                                    ),
                                ],
                                actions=["s3:PutObject"],
                                resources=[resource],
                            ),
                            aws.iam.GetPolicyDocumentStatementArgs(
                                principals=[
                                    aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                        type="Service",
                                        identifiers=["cloudfront.amazonaws.com"],
                                    ),
                                ],
                                actions=["s3:GetObject"],
                                resources=[resource],
                                conditions=[
                                    aws.iam.GetPolicyDocumentStatementConditionArgs(
                                        test="StringEquals",
                                        variable="aws:SourceArn",
                                        values=[
                                            f"arn:aws:cloudfront::{Resource.Aws.account.id}:distribution/{Resource.AssetsRouter.distributionId}"
                                        ],
                                    ),
                                ],
                            ),
                        ]
                    )
                ).json,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._route = Route(
            args=RouteArgs(
                tenant_id=args.tenant_id,
                domain=self._access_point.domain_name,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )
