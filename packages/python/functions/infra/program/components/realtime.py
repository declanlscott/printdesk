from typing import Optional

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from sst import Resource
from types_boto3_appsync.type_defs import EventConfigTypeDef, AuthProviderTypeDef

from . import dynamic, ssl
from utils import naming, tags


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
            resource_name="EventApi",
            props=dynamic.aws.appsync.EventApiInputs(
                tenant_id=args.tenant_id,
                event_config=EventConfigTypeDef(
                    authProviders=[AuthProviderTypeDef(authType="AWS_IAM")],
                    connectionAuthModes=[AuthProviderTypeDef(authType="AWS_IAM")],
                    defaultPublishAuthModes=[AuthProviderTypeDef(authType="AWS_IAM")],
                    defaultSubscribeAuthModes=[AuthProviderTypeDef(authType="AWS_IAM")],
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__events_channel_namespace = dynamic.aws.appsync.ChannelNamespace(
            resource_name="EventsChannelNamespace",
            props=dynamic.aws.appsync.ChannelNamespaceInputs(
                tenant_id=args.tenant_id,
                api_id=self.__api.api_id,
                name="events",
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__replicache_channel_namespace = dynamic.aws.appsync.ChannelNamespace(
            resource_name="ReplicacheChannelNamespace",
            props=dynamic.aws.appsync.ChannelNamespaceInputs(
                tenant_id=args.tenant_id,
                api_id=self.__api.api_id,
                name="replicache"
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__subscriber_role = aws.iam.Role(
            resource_name="SubscriberRole",
            args=aws.iam.RoleArgs(
                name=naming.template(
                    name_template=Resource.TenantRoles.realtimePublisher.nameTemplate,
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
                    aws.iam.RoleInlinePolicyArgs(
                        policy=aws.iam.get_policy_document_output(
                            statements=self.__api.api_arn.apply(
                                lambda api_arn: [
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventConnect"],
                                        resources=[api_arn],
                                    ),
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventSubscribe"],
                                        resources=[f"{api_arn}/*"],
                                    ),
                                ]
                            )
                        ).json
                    )
                ],
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__publisher_role = aws.iam.Role(
            resource_name="PublisherRole",
            args=aws.iam.RoleArgs(
                name=naming.template(
                    name_template=Resource.TenantRoles.realtimePublisher.nameTemplate,
                    tenant_id=args.tenant_id,
                ),
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS",
                                    identifiers=[Resource.Api.roleArn],
                                ),
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS",
                                    identifiers=[Resource.PapercutSync.roleArn],
                                ),
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).json,
                inline_policies=[
                    aws.iam.RoleInlinePolicyArgs(
                        policy=aws.iam.get_policy_document_output(
                            statements=self.__api.api_arn.apply(
                                lambda api_arn: [
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventPublish"],
                                        resources=[f"{api_arn}/*"],
                                    )
                                ]
                            )
                        ).json
                    )
                ],
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__ssl = ssl.Ssl(
            name="Realtime",
            args=ssl.SslArgs(
                tenant_id=args.tenant_id,
                domain_name_template=Resource.TenantDomains.realtime.nameTemplate,
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__domain_name = aws.appsync.DomainName(
            resource_name="DomainName",
            args=aws.appsync.DomainNameArgs(
                domain_name=self.__ssl.certificate.domain_name,
                certificate_arn=self.__ssl.certificate.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__domain_name_api_association = aws.appsync.DomainNameApiAssociation(
            resource_name="DomainNameApiAssociation",
            args=aws.appsync.DomainNameApiAssociationArgs(
                api_id=self.__api.api_id,
                domain_name=self.__domain_name.domain_name,
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__alias_record = cloudflare.Record(
            resource_name="AliasRecord",
            args=cloudflare.RecordArgs(
                zone_id=Resource.Zone.id,
                type="CNAME",
                name=self.__domain_name.domain_name,
                content=self.__domain_name.appsync_domain_name,
                ttl=1,
                proxied=True
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True
            )
        )

        self.register_outputs({
            "api": self.__api.id,
            "events_channel_namespace": self.__events_channel_namespace.id,
            "replicache_channel_namespace": self.__replicache_channel_namespace.id,
            "subscriber_role": self.__subscriber_role.id,
            "publisher_role": self.__publisher_role.id,
            "domain_name": self.__domain_name.id,
            "domain_name_api_association": self.__domain_name_api_association.id,
            "alias_record": self.__alias_record.id
        })
