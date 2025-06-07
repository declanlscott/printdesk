from typing import Optional, Sequence

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from sst import Resource

from . import dynamic
from utils import build_name, tags


class RealtimeArgs:
    def __init__(self, tenant_id: str, us_east_1_provider: aws.Provider):
        self.tenant_id = tenant_id
        self.us_east_1_provider = us_east_1_provider

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
                event_config={
                    "authProviders": [{"authType": "AWS_IAM"}],
                    "connectionAuthModes": [{"authType": "AWS_IAM"}],
                    "defaultPublishAuthModes": [{"authType": "AWS_IAM"}],
                    "defaultSubscribeAuthModes": [{"authType": "AWS_IAM"}],
                },
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

        self.__subscriber_role: pulumi.Output[aws.iam.Role] = self.__api.api_arn.apply(
            lambda api_arn: aws.iam.Role(
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
                    inline_policies=[
                        aws.iam.RoleInlinePolicyArgs(
                            policy=aws.iam.get_policy_document_output(
                                statements=[
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventConnect"],
                                        resource=["TODO"],
                                    ),
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventSubscribe"],
                                        resource=[f"TODO/*"],
                                    ),
                                ]
                            ).minified_json
                        )
                    ],
                    tags=tags(args.tenant_id),
                ),
                opts=pulumi.ResourceOptions(parent=self),
            )
        )

        self.__publisher_role: pulumi.Output[aws.iam.Role] = self.__api.api_arn.apply(
            lambda api_arn: aws.iam.Role(
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
                    inline_policies=[
                        aws.iam.RoleInlinePolicyArgs(
                            policy=aws.iam.get_policy_document_output(
                                statements=[
                                    aws.iam.GetPolicyDocumentStatementArgs(
                                        actions=["appsync:EventPublish"],
                                        resources=[f"{api_arn}/*"],
                                    )
                                ]
                            ).minified_json
                        )
                    ],
                    tags=tags(args.tenant_id),
                ),
                opts=pulumi.ResourceOptions(parent=self),
            )
        )

        self.__certificate = aws.acm.Certificate(
            resource_name="Certificate",
            props=aws.acm.CertificateArgs(
                domain_name=build_name(Resource.TenantDomains.realtime.nameTemplate, args.tenant_id),
                validation_method="DNS",
            ),
            opts=pulumi.ResourceOptions(parent=self, provider=args.us_east_1_provider)
        )

        self.__certificate_validation_records = []
        def create_validation_records(
            options: Sequence[aws.acm.outputs.CertificateValidationOption],
        ):
            for index, option in enumerate(options):
                self.__certificate_validation_records.append(
                    cloudflare.Record(
                        resource_name=f"CertificateValidationRecord{index}",
                        args=cloudflare.RecordArgs(
                            zone_id=Resource.Zone.id,
                            type=option.resource_record_type,
                            name=option.resource_record_name,
                            content=option.resource_record_value,
                            ttl=60,
                        ),
                        opts=pulumi.ResourceOptions(parent=self),
                    )
                )
        self.__certificate.domain_validation_options.apply(create_validation_records)

        self.__certificate_validation = aws.acm.CertificateValidation(
            resource_name="CertificateValidation",
            props=aws.acm.CertificateValidationArgs(
                certificate_arn=self.__certificate.arn,
                validation_record_fqdns=[
                    record.hostname for record in self.__certificate_validation_records
                ]
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__domain_name = aws.appsync.DomainName(
            resource_name="DomainName",
            props=aws.appsync.DomainNameArgs(
                domain_name=self.__certificate.domain_name,
                certificate_arn=self.__certificate.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__domain_name_api_association = aws.appsync.DomainNameApiAssociation(
            resource_name="DomainNameApiAssociation",
            props=aws.appsync.DomainNameApiAssociationArgs(
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
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.register_outputs({
            "api": self.__api.id,
            "events_channel_namespace": self.__events_channel_namespace.id,
            "replicache_channel_namespace": self.__replicache_channel_namespace.id,
            "subscriber_role": self.__subscriber_role.apply(lambda role: role.id),
            "publisher_role": self.__publisher_role.apply(lambda role: role.id),
            "certificate": self.__certificate.id,
            "certificate_validation_records": [
                record.id for record in self.__certificate_validation_records
            ],
            "certificate_validation": self.__certificate_validation.id,
            "domain_name": self.__domain_name.id,
            "domain_name_api_association": self.__domain_name_api_association.id,
            "alias_record": self.__alias_record.id
        })
