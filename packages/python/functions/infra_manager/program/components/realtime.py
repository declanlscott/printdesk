from dataclasses import dataclass
from typing import Optional

import pulumi
import pulumi_aws as aws
from sst import Resource

from utils import naming


@dataclass
class RealtimeArgs:
    tenant_id: pulumi.Input[str]


class Realtime(pulumi.ComponentResource):
    def __init__(
        self, args: RealtimeArgs, opts: Optional[pulumi.ResourceOptions] = None
    ):
        super().__init__(
            t="pd:aws:Realtime",
            name="Realtime",
            props=vars(args),
            opts=opts,
        )

        self._channel_namespace = aws.appsync.ChannelNamespace(
            resource_name="RealtimeChannelNamespace",
            args=aws.appsync.ChannelNamespaceArgs(
                api_id=Resource.RealtimeApi.id,
                name=args.tenant_id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._publisher_role = aws.iam.Role(
            resource_name="RealtimePublisherRole",
            args=aws.iam.RoleArgs(
                name=pulumi.Output.from_input(args.tenant_id).apply(
                    lambda tenant_id: naming.template(
                        name_template=Resource.RealtimeTenantChannelNamespacePublisherRoleTemplate.name,
                        tenant_id=tenant_id,
                    )
                ),
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS",
                                    identifiers=[Resource.Api.roleArn],
                                ),
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).json,
                inline_policies=[
                    aws.iam.RoleInlinePolicyArgs(
                        policy=aws.iam.get_policy_document_output(
                            statements=self._channel_namespace.channel_namespace_arn.apply(
                                lambda channel_namespace_arn: [
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventPublish"],
                                        resources=[channel_namespace_arn],
                                    )
                                ]
                            )
                        ).json
                    )
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._subscriber_role = aws.iam.Role(
            resource_name="RealtimeSubscriberRole",
            args=aws.iam.RoleArgs(
                name=pulumi.Output.from_input(args.tenant_id).apply(
                    lambda tenant_id: naming.template(
                        name_template=Resource.RealtimeTenantChannelNamespaceSubscriberRoleTemplate.name,
                        tenant_id=tenant_id,
                    )
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
                    aws.iam.RoleInlinePolicyArgs(
                        policy=aws.iam.get_policy_document_output(
                            statements=self._channel_namespace.channel_namespace_arn.apply(
                                lambda channel_namespace_arn: [
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventConnect"],
                                        resources=[Resource.RealtimeApi.arn],
                                    ),
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventSubscribe"],
                                        resources=[channel_namespace_arn],
                                    ),
                                ]
                            )
                        ).json
                    )
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )
