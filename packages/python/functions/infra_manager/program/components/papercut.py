import base64
from dataclasses import dataclass
import json
from typing import Optional

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from sst import Resource

from program.components.vpc_service_binding import (
    VpcServiceBinding,
    VpcServiceBindingArgs,
)
from models import PapercutEnabledConfig
from utils import naming, is_prod_stage


@dataclass
class PapercutArgs:
    tenant_id: pulumi.Input[str]
    config: PapercutEnabledConfig


class Papercut(pulumi.ComponentResource):
    def __init__(
        self, args: PapercutArgs, opts: Optional[pulumi.ResourceOptions] = None
    ):
        super().__init__(
            t="pd:awscf:Papercut", name="Papercut", props=vars(args), opts=opts
        )

        self._sync_schedule_role = aws.iam.Role(
            resource_name="PapercutSyncScheduleRole",
            args=aws.iam.RoleArgs(
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="Service",
                                    identifiers=["scheduler.amazonaws.com"],
                                )
                            ]
                        )
                    ]
                ).json,
                inline_policies=[
                    aws.iam.get_policy_document_output(
                        statements=[
                            aws.iam.GetPolicyDocumentStatementArgs(
                                actions=["lambda:InvokeFunction"],
                                resources=[Resource.PapercutSync.arn],
                            )
                        ]
                    ).json
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._sync_schedule = aws.scheduler.Schedule(
            resource_name="PapercutSyncSchedule",
            args=aws.scheduler.ScheduleArgs(
                flexible_time_window=aws.scheduler.ScheduleFlexibleTimeWindowArgs(
                    mode="OFF",
                ),
                schedule_expression=f"cron({args.config.sync.cron_expression})",
                schedule_expression_timezone=args.config.sync.timezone,
                target=aws.scheduler.ScheduleTargetArgs(
                    arn=Resource.PapercutSync.arn,
                    role_arn=self._sync_schedule_role.arn,
                    input=pulumi.Output.json_dumps({"tenantId": args.tenant_id}),
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._invoices_processor_dead_letter_queue = aws.sqs.Queue(
            resource_name="PapercutInvoicesProcessorDeadLetterQueue",
            args=aws.sqs.QueueArgs(
                fifo_queue=True,
                content_based_deduplication=True,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=is_prod_stage,
            ),
        )

        self._invoices_processor_queue = aws.sqs.Queue(
            resource_name="PapercutInvoicesProcessorQueue",
            args=aws.sqs.QueueArgs(
                fifo_queue=True,
                content_based_deduplication=True,
                visibility_timeout_seconds=30,
                redrive_policy=pulumi.Output.json_dumps(
                    {
                        "deadLetterTargetArn": self._invoices_processor_dead_letter_queue.arn,
                        "maxReceiveCount": 3,
                    }
                ),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                retain_on_delete=is_prod_stage,
            ),
        )

        self._invoices_processor_queue_policy = aws.sqs.QueuePolicy(
            resource_name="PapercutInvoicesProcessorQueuePolicy",
            args=aws.sqs.QueuePolicyArgs(
                queue_url=self._invoices_processor_queue.url,
                policy=aws.iam.get_policy_document_output(
                    statements=self._invoices_processor_queue.arn.apply(
                        lambda arn: [
                            aws.iam.GetPolicyDocumentStatementArgs(
                                principals=[
                                    aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                        type="AWS",
                                        identifiers=[
                                            Resource.InvoicesProcessor.roleArn
                                        ],
                                    )
                                ],
                                actions=[
                                    "sqs:ChangeMessageVisibility",
                                    "sqs:DeleteMessage",
                                    "sqs:GetQueueAttributes",
                                    "sqs:GetQueueUrl",
                                    "sqs:ReceiveMessage",
                                ],
                                resources=[arn],
                            )
                        ]
                    )
                ).json,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._invoices_processor_event_source_mapping = aws.lambda_.EventSourceMapping(
            resource_name="PapercutInvoicesProcessorEventSourceMapping",
            args=aws.lambda_.EventSourceMappingArgs(
                function_response_types=["ReportBatchItemFailures"],
                batch_size=10,
                maximum_batching_window_in_seconds=0,
                event_source_arn=self._invoices_processor_queue.arn,
                function_name=Resource.InvoicesProcessor.name,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._invoices_processor_queue_sender_role = aws.iam.Role(
            resource_name="PapercutInvoicesProcessorQueueSenderRole",
            args=aws.iam.RoleArgs(
                name=pulumi.Output.from_input(args.tenant_id).apply(
                    lambda tenant_id: naming.template(
                        name_template=Resource.InvoicesProcessorQueueSenderRoleTemplate.name,
                        tenant_id=tenant_id,
                    )
                ),
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="AWS",
                                    identifiers=[Resource.Api.arn],
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).json,
                inline_policies=[
                    aws.iam.get_policy_document_output(
                        statements=self._invoices_processor_queue.arn.apply(
                            lambda arn: [
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["sqs:SendMessage", "sqs:SendMessageBatch"],
                                    resources=[arn],
                                )
                            ]
                        )
                    ).json
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._api_tunnel = cloudflare.ZeroTrustTunnelCloudflared(
            resource_name="PapercutApiTunnel",
            args=cloudflare.ZeroTrustTunnelCloudflaredArgs(
                account_id=Resource.Cloudflare.account.id,
                config_src="cloudflare",
                name="",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._api_vpc_service = cloudflare.ConnectivityDirectoryService(
            resource_name="PapercutApiVpcService",
            args=cloudflare.ConnectivityDirectoryServiceArgs(
                account_id=Resource.Cloudflare.account.id,
                type="http",
                name="",
                host=cloudflare.ConnectivityDirectoryServiceHostArgs(
                    **(
                        {
                            "ipv4": args.config.api.host.ipv4,
                            "network": cloudflare.ConnectivityDirectoryServiceHostNetworkArgs(
                                tunnel_id=self._api_tunnel.id,
                            ),
                        }
                        if args.config.api.host._tag == "PapercutApiHostIpv4Config"
                        else {
                            "hostname": args.config.api.host.name,
                            **(
                                {
                                    "network": cloudflare.ConnectivityDirectoryServiceHostNetworkArgs(
                                        tunnel_id=self._api_tunnel.id,
                                    )
                                }
                                if args.config.api.host.resolver_ips is None
                                else {
                                    "resolver_network": cloudflare.ConnectivityDirectoryServiceHostResolverNetworkArgs(
                                        tunnel_id=self._api_tunnel.id,
                                        resolver_ips=args.config.api.host.resolver_ips,
                                    )
                                }
                            ),
                        }
                    )
                ),
                **(
                    {"https_port": args.config.api.port}
                    if args.config.api.protocol == "https"
                    else {"http_port": args.config.api.port}
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._api_gateway_script = cloudflare.WorkersScript(
            resource_name="PapercutApiGatewayScript",
            args=cloudflare.WorkersScriptArgs(
                script_name="PapercutApiGatewayScript",
                account_id=Resource.Cloudflare.account.id,
                compatibility_date="2026-05-05",
                content=aws.s3.get_object_output(
                    bucket=Resource.PapercutApiGatewayScriptObject.bucket,
                    key=Resource.PapercutApiGatewayScriptObject.key,
                    download_body=True,
                ).body,
                bindings=[
                    cloudflare.WorkersScriptBindingArgs(
                        type="plain_text",
                        name="AWS_ACCESS_KEY_ID",
                        text=Resource.PapercutApiGatewayAwsAccessKey.id,
                    ),
                    cloudflare.WorkersScriptBindingArgs(
                        type="secret_text",
                        name="AWS_SECRET_ACCESS_KEY",
                        text=pulumi.Output.secret(
                            Resource.PapercutApiGatewayAwsAccessKey.secret
                        ),
                    ),
                    cloudflare.WorkersScriptBindingArgs(
                        type="plain_text",
                        name="HOSTNAME",
                        text=args.config.api.host.ipv4
                        if args.config.api.host._tag == "PapercutApiHostIpv4Config"
                        else args.config.api.host.name,
                    ),
                    cloudflare.WorkersScriptBindingArgs(
                        type="plain_text",
                        name="PORT",
                        text=args.config.api.port,
                    ),
                    cloudflare.WorkersScriptBindingArgs(
                        type="plain_text",
                        name="PROTOCOL",
                        text=args.config.api.protocol,
                    ),
                    cloudflare.WorkersScriptBindingArgs(
                        type="secret_text",
                        name="Aws",
                        text=pulumi.Output.secret(
                            json.dumps(
                                {
                                    "account": {"id": Resource.Aws.account.id},
                                    "region": Resource.Aws.region,
                                    "type": Resource.Aws.type,
                                }
                            )
                        ),
                    ),
                    cloudflare.WorkersScriptBindingArgs(
                        type="secret_text",
                        name="Issuer",
                        text=pulumi.Output.secret(json.dumps(vars(Resource.Issuer))),
                    ),
                ],
                keep_bindings=["vpc_service"],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._api_gateway_vpc_service_binding = VpcServiceBinding(
            resource_name="PapercutApiGatewayVpcServiceBinding",
            args=VpcServiceBindingArgs(
                script_name=self._api_gateway_script.script_name,
                name="PAPERCUT_API",
                service_id=self._api_vpc_service.id,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._api_domain = cloudflare.WorkersCustomDomain(
            resource_name="PapercutApiDomain",
            args=cloudflare.WorkersCustomDomainArgs(
                account_id=Resource.Cloudflare.account.id,
                zone_id=Resource.Zone.id,
                hostname=pulumi.Output.from_input(args.tenant_id).apply(
                    lambda tenant_id: (
                        base64.b32encode(tenant_id.encode("utf-8"))
                        .decode("utf-8")
                        .lower()
                        .rstrip("=")
                    )
                ),
                service=self._api_gateway_script.script_name,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

    @property
    def api_tunnel_id(self):
        return self._api_tunnel.id
