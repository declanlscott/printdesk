import pulumi
import pulumi_aws as aws
from sst import Resource

from . import dynamic
from src.utilities import tags, build_name

from typing import TypedDict, Optional


class RealtimeDns(TypedDict):
    http: pulumi.Output[str]
    realtime: pulumi.Output[str]


class RealtimeArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Realtime(pulumi.ComponentResource):
    def __init__(
        self, args: RealtimeArgs, opts: Optional[pulumi.ResourceOptions] = None
    ):
        super().__init__(
            t="pd:resource:Realtime",
            name="Realtime",
            props=vars(args),
            opts=opts,
        )

        self.__api = dynamic.aws.appsync.EventApi(
            name="EventApi",
            props=dynamic.aws.appsync.EventApiInputs(
                tenant_id=args.tenant_id,
                event_config={
                    "authProviders": [{"authType": "AWS_IAM"}],
                    "connectionAuthModes": [{"authType": "AWS_IAM"}],
                    "defaultPublishAuthModes": [{"authType": "AWS_IAM"}],
                    "defaultSubscribeAuthModes": [{"authType": "AWS_IAM"}],
                },
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__events_channel_namespace = dynamic.aws.appsync.ChannelNamespace(
            name="EventsChannelNamespace",
            props=dynamic.aws.appsync.ChannelNamespaceInputs(
                tenant_id=args.tenant_id,
                api_id=self.__api.api_id,
                name="events",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__replicache_channel_namespace = dynamic.aws.appsync.ChannelNamespace(
            name="ReplicacheChannelNamespace",
            props=dynamic.aws.appsync.ChannelNamespaceInputs(
                tenant_id=args.tenant_id,
                api_id=self.__api.api_id,
                name="replicache",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__subscriber_role = aws.iam.Role(
            resource_name="SubscriberRole",
            args=aws.iam.RoleArgs(
                name=build_name(
                    name_template=Resource.TenantRoles.realtimePublisher.nameTemplate,
                    tenant_id=args.tenant_id,
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
                ).minified_json,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__subscriber_role_policy: pulumi.Output[aws.iam.RolePolicy] = (
            self.__api.api_arn.apply(
                lambda api_arn: aws.iam.RolePolicy(
                    resource_name="SubscriberRolePolicy",
                    args=aws.iam.RolePolicyArgs(
                        role=self.__subscriber_role.name,
                        policy=aws.iam.get_policy_document_output(
                            statements=[
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["appsync:EventConnect"],
                                    resources=[api_arn],
                                ),
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["appsync:EventSubscribe"],
                                    resources=[f"{api_arn}/*"],
                                ),
                            ]
                        ).minified_json,
                    ),
                    opts=pulumi.ResourceOptions(parent=self),
                )
            )
        )

        self.__publisher_role = aws.iam.Role(
            resource_name="PublisherRole",
            args=aws.iam.RoleArgs(
                name=build_name(
                    name_template=Resource.TenantRoles.realtimePublisher.nameTemplate,
                    tenant_id=args.tenant_id,
                ),
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS", identifiers=[Resource.Api.roleArn]
                                ),
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS",
                                    identifiers=[Resource.PapercutSync.roleArn],
                                ),
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).minified_json,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__publisher_role_policy: pulumi.Output[aws.iam.RolePolicy] = (
            self.__api.api_arn.apply(
                lambda api_arn: aws.iam.RolePolicy(
                    resource_name="PublisherRolePolicy",
                    args=aws.iam.RolePolicyArgs(
                        role=self.__publisher_role.name,
                        policy=aws.iam.get_policy_document_output(
                            statements=[
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["appsync:EventPublish"],
                                    resources=[f"{api_arn}/*"],
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
                "api": self.__api.id,
                "events_channel_namespace": self.__events_channel_namespace.id,
                "replicache_channel_namespace": self.__replicache_channel_namespace.id,
                "subscriber_role": self.__subscriber_role.id,
                "subscriber_role_policy": self.__subscriber_role_policy.apply(
                    lambda policy: policy.id
                ),
                "publisher_role": self.__publisher_role.id,
                "publisher_role_policy": self.__publisher_role_policy.apply(
                    lambda policy: policy.id
                ),
            },
        )

    @property
    def dns(self) -> RealtimeDns:
        return {
            "http": self.__api.dns["HTTP"],
            "realtime": self.__api.dns["REALTIME"],
        }
